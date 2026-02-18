import { redirect } from 'next/navigation';

export default function Contacts() {
  redirect('/knowledge?tab=contacts');
}
