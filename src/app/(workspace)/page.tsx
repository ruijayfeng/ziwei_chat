import { AppLayout } from '@/components/app-layout'
import { ChatProvider } from '@/components/chat/chat-session'
import { ChatExperience } from '@/components/chat/chat-experience'
import { ChatInspector } from '@/components/chat/chat-inspector'

export default function Home() {
  return (
    <ChatProvider>
      <AppLayout fill collapsibleInspector inspector={<ChatInspector />}>
        <ChatExperience />
      </AppLayout>
    </ChatProvider>
  )
}
