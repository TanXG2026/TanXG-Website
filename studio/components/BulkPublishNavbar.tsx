import {Button, Card, Dialog, Flex, Stack, Text} from '@sanity/ui'
import {useCallback, useState} from 'react'
import {
  type NavbarProps,
  type SanityDocument,
  useClient,
  useCurrentUser,
  useDataset,
  useWorkspace,
  validateDocument,
} from 'sanity'

const API_VERSION = '2026-08-31'

const PUBLISHABLE_TYPES = [
  'siteSettings',
  'uiSettings',
  'pageSettings',
  'course',
  'lectureNote',
  'researchDomain',
  'researchArticle',
  'popularScience',
  'visualization',
  'communityPost',
  'teamMember',
]

type DraftDocument = SanityDocument & {
  name?: string
  title?: string
}

type InvalidDraft = {
  draft: DraftDocument
  messages: string[]
}

function getDocumentTitle(document: DraftDocument) {
  return document.title || document.name || document._id.replace(/^drafts\./, '')
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return '发生未知错误，请稍后重试。'
}

export function BulkPublishNavbar(props: NavbarProps) {
  const client = useClient({apiVersion: API_VERSION}).withConfig({perspective: 'raw', useCdn: false})
  const currentUser = useCurrentUser()
  const dataset = useDataset()
  const workspace = useWorkspace()
  const [drafts, setDrafts] = useState<DraftDocument[]>([])
  const [invalidDrafts, setInvalidDrafts] = useState<InvalidDraft[]>([])
  const [dialog, setDialog] = useState<'confirm' | 'invalid' | null>(null)
  const [isWorking, setIsWorking] = useState(false)
  const [status, setStatus] = useState('')

  const closeDialog = useCallback(() => {
    if (isWorking) return
    setDialog(null)
  }, [isWorking])

  const inspectDrafts = useCallback(async () => {
    setIsWorking(true)
    setStatus('正在检查待发布内容…')

    try {
      const pendingDrafts = await client.fetch<DraftDocument[]>(
        '*[_id in path("drafts.**") && _type in $types] | order(_updatedAt asc)',
        {types: PUBLISHABLE_TYPES},
      )

      if (pendingDrafts.length === 0) {
        setDrafts([])
        setInvalidDrafts([])
        setStatus('当前没有待发布的修改。')
        return
      }

      const validationResults = await Promise.all(
        pendingDrafts.map(async (draft) => {
          const markers = await validateDocument({
            document: draft,
            workspace,
            environment: 'studio',
            currentUser,
          })

          return {
            draft,
            messages: markers
              .filter((marker) => marker.level === 'error')
              .map((marker) => marker.message),
          }
        }),
      )

      const invalid = validationResults.filter((result) => result.messages.length > 0)
      setDrafts(pendingDrafts)
      setInvalidDrafts(invalid)

      if (invalid.length > 0) {
        setStatus(`有 ${invalid.length} 项内容需要先修正。`)
        setDialog('invalid')
        return
      }

      setStatus(`已检查 ${pendingDrafts.length} 项待发布内容。`)
      setDialog('confirm')
    } catch (error) {
      setStatus(`检查失败：${getErrorMessage(error)}`)
    } finally {
      setIsWorking(false)
    }
  }, [client, currentUser, workspace])

  const publishAll = useCallback(async () => {
    if (drafts.length === 0) return

    setIsWorking(true)
    setStatus(`正在发布 ${drafts.length} 项内容…`)

    try {
      await client.request({
        uri: `/data/actions/${encodeURIComponent(dataset)}`,
        method: 'POST',
        body: {
          actions: drafts.map((draft) => ({
            actionType: 'sanity.action.document.publish',
            draftId: draft._id,
            publishedId: draft._id.replace(/^drafts\./, ''),
            ifDraftRevisionId: draft._rev,
          })),
        },
      })

      setDialog(null)
      setDrafts([])
      setInvalidDrafts([])
      setStatus(`已成功发布 ${drafts.length} 项内容。`)
    } catch (error) {
      setDialog(null)
      setStatus(`发布失败，未进行部分发布：${getErrorMessage(error)}`)
    } finally {
      setIsWorking(false)
    }
  }, [client, dataset, drafts])

  return (
    <Stack>
      {props.renderDefault(props)}

      <Card borderTop padding={2} tone="transparent">
        <Flex align="center" gap={3} justify="flex-end" wrap="wrap">
          {status ? (
            <Text aria-live="polite" size={1}>
              {status}
            </Text>
          ) : null}
          <Button
            disabled={isWorking}
            mode="default"
            onClick={inspectDrafts}
            text={isWorking ? '正在处理…' : '发布全部修改'}
            tone="positive"
          />
        </Flex>
      </Card>

      {dialog === 'confirm' ? (
        <Dialog
          footer={
            <Flex gap={2} justify="flex-end" padding={3}>
              <Button disabled={isWorking} mode="ghost" onClick={closeDialog} text="取消" />
              <Button
                disabled={isWorking}
                onClick={publishAll}
                text={isWorking ? '正在发布…' : `确认发布 ${drafts.length} 项`}
                tone="positive"
              />
            </Flex>
          }
          header="确认发布全部修改"
          id="tanxg-bulk-publish-confirm"
          onClose={closeDialog}
          width={1}
        >
          <Stack gap={4} padding={4}>
            <Text>即将把当前全部 {drafts.length} 项草稿发布到官网。</Text>
            <Card padding={3} radius={2} tone="caution">
              <Text size={1}>如果确认期间有人继续编辑，整批发布会安全停止，不会只发布一部分。</Text>
            </Card>
          </Stack>
        </Dialog>
      ) : null}

      {dialog === 'invalid' ? (
        <Dialog
          footer={
            <Flex justify="flex-end" padding={3}>
              <Button onClick={closeDialog} text="知道了" />
            </Flex>
          }
          header="暂时无法发布全部修改"
          id="tanxg-bulk-publish-invalid"
          onClose={closeDialog}
          width={1}
        >
          <Stack gap={4} padding={4}>
            <Text>以下内容存在必填项或格式错误，请先修正后再试：</Text>
            <Stack gap={3}>
              {invalidDrafts.slice(0, 8).map(({draft, messages}) => (
                <Card border key={draft._id} padding={3} radius={2}>
                  <Stack gap={2}>
                    <Text weight="semibold">{getDocumentTitle(draft)}</Text>
                    <Text size={1}>{messages.join('；')}</Text>
                  </Stack>
                </Card>
              ))}
            </Stack>
            {invalidDrafts.length > 8 ? (
              <Text size={1}>另外还有 {invalidDrafts.length - 8} 项内容需要修正。</Text>
            ) : null}
          </Stack>
        </Dialog>
      ) : null}
    </Stack>
  )
}
