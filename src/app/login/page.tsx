import { getBusinessSettings } from '@/lib/businessSettings';
import { LoginForm } from './LoginForm';

export default async function LoginPage() {
  const biz = await getBusinessSettings();
  return <LoginForm businessName={biz.name} />;
}
