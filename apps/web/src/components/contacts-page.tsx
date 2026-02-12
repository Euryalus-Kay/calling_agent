'use client';

import { useState, useMemo, useCallback } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  Search,
  Plus,
  Star,
  Phone,
  Mail,
  Building2,
  Pencil,
  Trash2,
  User,
  BookOpen,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Contact } from '@/types';

interface ContactsPageProps {
  contacts: Contact[];
  userId: string;
}

type Category = Contact['category'];

const CATEGORIES: { value: Category | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'personal', label: 'Personal' },
  { value: 'business', label: 'Business' },
  { value: 'medical', label: 'Medical' },
  { value: 'government', label: 'Government' },
  { value: 'other', label: 'Other' },
];

const categoryColors: Record<Category, string> = {
  personal: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  business: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  medical: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  government: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  other: 'bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300',
};

const emptyFormState = {
  name: '',
  phone_number: '',
  email: '',
  company: '',
  category: 'personal' as Category,
  notes: '',
  is_favorite: false,
};

export function ContactsPage({ contacts: initialContacts, userId }: ContactsPageProps) {
  const supabase = createSupabaseBrowserClient();
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [form, setForm] = useState(emptyFormState);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = contacts;
    if (activeCategory !== 'all') {
      result = result.filter((c) => c.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.company && c.company.toLowerCase().includes(q)) ||
          (c.phone_number && c.phone_number.includes(q)) ||
          (c.email && c.email.toLowerCase().includes(q))
      );
    }
    // Favorites first, then alphabetical
    return result.sort((a, b) => {
      if (a.is_favorite !== b.is_favorite) return a.is_favorite ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [contacts, search, activeCategory]);

  const openAddDialog = useCallback(() => {
    setEditingContact(null);
    setForm(emptyFormState);
    setDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((contact: Contact) => {
    setEditingContact(contact);
    setForm({
      name: contact.name,
      phone_number: contact.phone_number || '',
      email: contact.email || '',
      company: contact.company || '',
      category: contact.category,
      notes: contact.notes || '',
      is_favorite: contact.is_favorite,
    });
    setDialogOpen(true);
  }, []);

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      phone_number: form.phone_number.trim() || null,
      email: form.email.trim() || null,
      company: form.company.trim() || null,
      category: form.category,
      notes: form.notes.trim() || null,
      is_favorite: form.is_favorite,
      user_id: userId,
    };

    if (editingContact) {
      // Optimistic update
      const updated = { ...editingContact, ...payload, updated_at: new Date().toISOString() };
      setContacts((prev) => prev.map((c) => (c.id === editingContact.id ? updated : c)));
      setDialogOpen(false);
      toast.success('Contact updated');

      const { error } = await supabase
        .from('contacts')
        .update(payload)
        .eq('id', editingContact.id);

      if (error) {
        // Revert
        setContacts((prev) => prev.map((c) => (c.id === editingContact.id ? editingContact : c)));
        toast.error('Failed to update contact');
      }
    } else {
      const { data, error } = await supabase
        .from('contacts')
        .insert(payload)
        .select()
        .single();

      if (error || !data) {
        toast.error('Failed to create contact');
      } else {
        setContacts((prev) => [...prev, data]);
        setDialogOpen(false);
        toast.success('Contact added');
      }
    }
    setSaving(false);
  }

  async function handleDelete(contactId: string) {
    setDeleting(contactId);
    const contact = contacts.find((c) => c.id === contactId);
    // Optimistic
    setContacts((prev) => prev.filter((c) => c.id !== contactId));
    setExpandedId(null);
    toast.success('Contact deleted');

    const { error } = await supabase.from('contacts').delete().eq('id', contactId);
    if (error && contact) {
      setContacts((prev) => [...prev, contact].sort((a, b) => a.name.localeCompare(b.name)));
      toast.error('Failed to delete contact');
    }
    setDeleting(null);
  }

  async function toggleFavorite(contact: Contact) {
    const newVal = !contact.is_favorite;
    // Optimistic
    setContacts((prev) =>
      prev.map((c) => (c.id === contact.id ? { ...c, is_favorite: newVal } : c))
    );

    const { error } = await supabase
      .from('contacts')
      .update({ is_favorite: newVal })
      .eq('id', contact.id);

    if (error) {
      setContacts((prev) =>
        prev.map((c) => (c.id === contact.id ? { ...c, is_favorite: contact.is_favorite } : c))
      );
      toast.error('Failed to update favorite');
    }
  }

  function getInitials(name: string) {
    return name
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {contacts.length} {contacts.length === 1 ? 'contact' : 'contacts'}
          </p>
        </div>
        <Button onClick={openAddDialog} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Add Contact
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, company, phone, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Category Tabs */}
      <Tabs
        value={activeCategory}
        onValueChange={(v) => setActiveCategory(v as Category | 'all')}
        className="mb-6"
      >
        <TabsList className="flex-wrap">
          {CATEGORIES.map((cat) => (
            <TabsTrigger key={cat.value} value={cat.value}>
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Contact Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
            <BookOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-medium mb-1">
            {contacts.length === 0
              ? 'Your phone book is empty'
              : 'No contacts match your search'}
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            {contacts.length === 0
              ? 'Add your first contact to keep track of the people and places you call.'
              : 'Try adjusting your search or filter to find who you\'re looking for.'}
          </p>
          {contacts.length === 0 && (
            <Button onClick={openAddDialog} variant="outline" className="mt-4 gap-1.5">
              <Plus className="h-4 w-4" />
              Add your first contact
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((contact) => {
            const isExpanded = expandedId === contact.id;
            return (
              <Card
                key={contact.id}
                className={cn(
                  'transition-all duration-200 cursor-pointer hover:shadow-md',
                  isExpanded && 'ring-1 ring-primary/20 shadow-md sm:col-span-2'
                )}
              >
                <CardContent
                  className="p-4"
                  onClick={() => setExpandedId(isExpanded ? null : contact.id)}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                      {getInitials(contact.name)}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{contact.name}</span>
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-[10px] px-1.5 py-0 border-0',
                            categoryColors[contact.category]
                          )}
                        >
                          {contact.category}
                        </Badge>
                      </div>
                      {contact.company && (
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                          <Building2 className="h-3 w-3" />
                          <span className="truncate">{contact.company}</span>
                        </div>
                      )}
                      {contact.phone_number && (
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          <span>{contact.phone_number}</span>
                        </div>
                      )}
                    </div>

                    {/* Favorite Star */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(contact);
                      }}
                      className="shrink-0 p-1 rounded-md hover:bg-muted transition-colors"
                      title={contact.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Star
                        className={cn(
                          'h-4 w-4 transition-all duration-200',
                          contact.is_favorite
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-muted-foreground/40 hover:text-amber-400'
                        )}
                      />
                    </button>
                  </div>

                  {/* Expanded Section */}
                  {isExpanded && (
                    <div className="mt-4" onClick={(e) => e.stopPropagation()}>
                      <Separator className="mb-4" />

                      {contact.email && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                          <Mail className="h-3.5 w-3.5" />
                          <span>{contact.email}</span>
                        </div>
                      )}

                      {contact.notes && (
                        <div className="mt-3 rounded-md bg-muted/50 p-3">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                          <p className="text-sm whitespace-pre-wrap">{contact.notes}</p>
                        </div>
                      )}

                      {contact.last_contacted_at && (
                        <p className="text-xs text-muted-foreground mt-3">
                          Last contacted{' '}
                          {new Date(contact.last_contacted_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      )}

                      <div className="flex items-center gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => openEditDialog(contact)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-destructive hover:bg-destructive hover:text-white"
                          onClick={() => handleDelete(contact.id)}
                          disabled={deleting === contact.id}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {deleting === contact.id ? 'Deleting...' : 'Delete'}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingContact ? 'Edit Contact' : 'Add Contact'}
            </DialogTitle>
            <DialogDescription>
              {editingContact
                ? 'Update this contact\'s information.'
                : 'Add someone new to your phone book.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Name <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Dr. Smith, City Hall"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            {/* Phone + Email */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Phone</label>
                <Input
                  placeholder="(555) 123-4567"
                  value={form.phone_number}
                  onChange={(e) => setForm((f) => ({ ...f, phone_number: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Email</label>
                <Input
                  placeholder="name@example.com"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
            </div>

            {/* Company + Category */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Company</label>
                <Input
                  placeholder="Organization or business"
                  value={form.company}
                  onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as Category }))}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="personal">Personal</option>
                  <option value="business">Business</option>
                  <option value="medical">Medical</option>
                  <option value="government">Government</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Notes</label>
              <Textarea
                placeholder="Any details worth remembering..."
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
              />
            </div>

            {/* Favorite Toggle */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, is_favorite: !f.is_favorite }))}
                className="flex items-center gap-2 text-sm"
              >
                <Star
                  className={cn(
                    'h-5 w-5 transition-all duration-200',
                    form.is_favorite
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-muted-foreground'
                  )}
                />
                <span className={form.is_favorite ? 'text-foreground' : 'text-muted-foreground'}>
                  {form.is_favorite ? 'Favorited' : 'Mark as favorite'}
                </span>
              </button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving
                ? 'Saving...'
                : editingContact
                  ? 'Save Changes'
                  : 'Add Contact'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
