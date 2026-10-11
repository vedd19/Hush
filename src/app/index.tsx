import { Redirect } from 'expo-router';

// Entry point. Once sign-in exists (Phase 3) this decides between onboarding and the tabs.
export default function Index() {
  return <Redirect href="/welcome" />;
}
