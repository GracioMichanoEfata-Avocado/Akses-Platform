import TalkbackProvider from '@/components/accessibility/TalkbackProvider';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <TalkbackProvider>
      {children}
    </TalkbackProvider>
  );
}