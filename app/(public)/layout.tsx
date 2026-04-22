import { Providers } from '../providers';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <Providers>{children}</Providers>;
}
