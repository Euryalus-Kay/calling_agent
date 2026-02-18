import { redirect } from 'next/navigation';

export default function Memory() {
  redirect('/knowledge?tab=memory');
}
