'use client';

import { useState, useMemo, useCallback } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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

const categoryColors: Record<Category, { bg: string; text: string }> = {
  personal: { bg: 'rgba(35,131,226,0.06)', text: '#2383E2' },
  business: { bg: 'rgba(203,145,47,0.06)', text: '#CB912F' },
  medical: { bg: 'rgba(235,87,87,0.06)', text: '#EB5757' },
  government: { bg: 'rgba(120,119,116,0.08)', text: '#787774' },
  other: { bg: 'rgba(120,119,116,0.06)', text: '#787774' },
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

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 36,
  padding: '0 12px',
  fontSize: 14,
  color: '#37352F',
  background: '#FFFFFF',
  border: '1px solid #E3E2DE',
  borderRadius: 8,
  outline: 'none',
  boxSizing: 'border-box',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: 'auto' as const,
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  fontSize: 14,
  color: '#37352F',
  background: '#FFFFFF',
  border: '1px solid #E3E2DE',
  borderRadius: 8,
  outline: 'none',
  resize: 'vertical',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

function handleFocus(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = '#2383E2';
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(35,131,226,0.15)';
}

function handleBlur(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = '#E3E2DE';
  e.currentTarget.style.boxShadow = 'none';
}

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
    <div style={{ maxWidth: 896, margin: '0 auto', padding: '16px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#37352F', letterSpacing: '-0.01em', margin: 0 }}>Contacts</h1>
          <p style={{ fontSize: 14, color: '#787774', marginTop: 4 }}>
            {contacts.length} {contacts.length === 1 ? 'contact' : 'contacts'}
          </p>
        </div>
        <button
          onClick={openAddDialog}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            fontSize: 14,
            fontWeight: 500,
            color: '#FFFFFF',
            background: '#2383E2',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          <Plus style={{ height: 16, width: 16 }} />
          Add Contact
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', height: 16, width: 16, color: '#787774' }} />
        <input
          placeholder="Search by name, company, phone, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, paddingLeft: 36, paddingRight: search ? 36 : 12 }}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#787774', padding: 0 }}
          >
            <X style={{ height: 16, width: 16 }} />
          </button>
        )}
      </div>

      {/* Category Tabs */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 24 }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setActiveCategory(cat.value)}
            style={{
              padding: '4px 12px',
              fontSize: 13,
              fontWeight: activeCategory === cat.value ? 600 : 400,
              color: activeCategory === cat.value ? '#37352F' : '#787774',
              background: activeCategory === cat.value ? '#EFEFEF' : 'transparent',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              transition: 'background 120ms ease',
            }}
            onMouseEnter={(e) => { if (activeCategory !== cat.value) e.currentTarget.style.background = '#EFEFEF'; }}
            onMouseLeave={(e) => { if (activeCategory !== cat.value) e.currentTarget.style.background = 'transparent'; }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Contact Grid */}
      {filtered.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', textAlign: 'center' }}>
          <div style={{ display: 'flex', height: 64, width: 64, alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: '#F7F6F3', marginBottom: 16 }}>
            <BookOpen style={{ height: 32, width: 32, color: '#787774' }} />
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 500, marginBottom: 4, color: '#37352F' }}>
            {contacts.length === 0
              ? 'Your phone book is empty'
              : 'No contacts match your search'}
          </h2>
          <p style={{ fontSize: 14, color: '#787774', maxWidth: 360 }}>
            {contacts.length === 0
              ? 'Add your first contact to keep track of the people and places you call.'
              : 'Try adjusting your search or filter to find who you\'re looking for.'}
          </p>
          {contacts.length === 0 && (
            <button
              onClick={openAddDialog}
              style={{
                marginTop: 16,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                fontSize: 14,
                fontWeight: 500,
                color: '#37352F',
                background: '#FFFFFF',
                border: '1px solid #E3E2DE',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              <Plus style={{ height: 16, width: 16 }} />
              Add your first contact
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))' }}>
          {filtered.map((contact) => {
            const isExpanded = expandedId === contact.id;
            const catColor = categoryColors[contact.category];
            return (
              <div
                key={contact.id}
                style={{
                  background: '#FFFFFF',
                  border: `1px solid ${isExpanded ? '#2383E2' : '#E3E2DE'}`,
                  borderRadius: 8,
                  boxShadow: isExpanded ? '0 1px 2px rgba(0,0,0,0.06)' : '0 1px 2px rgba(0,0,0,0.06)',
                  transition: 'border-color 150ms ease, box-shadow 150ms ease',
                  gridColumn: isExpanded ? '1 / -1' : undefined,
                }}
              >
                <div
                  style={{ padding: 16, cursor: 'pointer' }}
                  onClick={() => setExpandedId(isExpanded ? null : contact.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    {/* Avatar */}
                    <div style={{
                      display: 'flex',
                      height: 40,
                      width: 40,
                      flexShrink: 0,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      background: 'rgba(35,131,226,0.08)',
                      color: '#2383E2',
                      fontSize: 14,
                      fontWeight: 600,
                    }}>
                      {getInitials(contact.name)}
                    </div>

                    {/* Info */}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 500, color: '#37352F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contact.name}</span>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 500,
                          padding: '1px 6px',
                          borderRadius: 4,
                          background: catColor.bg,
                          color: catColor.text,
                        }}>
                          {contact.category}
                        </span>
                      </div>
                      {contact.company && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 12, color: '#787774' }}>
                          <Building2 style={{ height: 12, width: 12 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contact.company}</span>
                        </div>
                      )}
                      {contact.phone_number && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, fontSize: 12, color: '#787774' }}>
                          <Phone style={{ height: 12, width: 12 }} />
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
                      style={{
                        flexShrink: 0,
                        padding: 4,
                        borderRadius: 6,
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'background 120ms ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#EFEFEF'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                      title={contact.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Star
                        style={{
                          height: 16,
                          width: 16,
                          color: contact.is_favorite ? '#CB912F' : '#E3E2DE',
                          fill: contact.is_favorite ? '#CB912F' : 'none',
                          transition: 'color 200ms ease, fill 200ms ease',
                        }}
                      />
                    </button>
                  </div>

                  {/* Expanded Section */}
                  {isExpanded && (
                    <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 16 }}>
                      <div style={{ height: 1, background: '#E3E2DE', marginBottom: 16 }} />

                      {contact.email && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#787774', marginBottom: 8 }}>
                          <Mail style={{ height: 14, width: 14 }} />
                          <span>{contact.email}</span>
                        </div>
                      )}

                      {contact.notes && (
                        <div style={{ marginTop: 12, borderRadius: 8, background: '#F7F6F3', padding: 12 }}>
                          <p style={{ fontSize: 12, fontWeight: 500, color: '#787774', marginBottom: 4, margin: '0 0 4px' }}>Notes</p>
                          <p style={{ fontSize: 14, whiteSpace: 'pre-wrap', color: '#37352F', margin: 0 }}>{contact.notes}</p>
                        </div>
                      )}

                      {contact.last_contacted_at && (
                        <p style={{ fontSize: 12, color: '#787774', marginTop: 12 }}>
                          Last contacted{' '}
                          {new Date(contact.last_contacted_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}>
                        <button
                          onClick={() => openEditDialog(contact)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '5px 10px',
                            fontSize: 13,
                            fontWeight: 500,
                            color: '#37352F',
                            background: '#FFFFFF',
                            border: '1px solid #E3E2DE',
                            borderRadius: 6,
                            cursor: 'pointer',
                          }}
                        >
                          <Pencil style={{ height: 14, width: 14 }} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(contact.id)}
                          disabled={deleting === contact.id}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '5px 10px',
                            fontSize: 13,
                            fontWeight: 500,
                            color: '#EB5757',
                            background: '#FFFFFF',
                            border: '1px solid #E3E2DE',
                            borderRadius: 6,
                            cursor: deleting === contact.id ? 'not-allowed' : 'pointer',
                            opacity: deleting === contact.id ? 0.5 : 1,
                          }}
                        >
                          <Trash2 style={{ height: 14, width: 14 }} />
                          {deleting === contact.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent style={{ maxHeight: '90vh', overflow: 'auto', borderRadius: 8, border: '1px solid #E3E2DE', boxShadow: '0 1px 2px rgba(0,0,0,0.06)', background: '#FFFFFF' }}>
          <DialogHeader>
            <DialogTitle style={{ fontSize: 18, fontWeight: 600, color: '#37352F' }}>
              {editingContact ? 'Edit Contact' : 'Add Contact'}
            </DialogTitle>
            <DialogDescription style={{ fontSize: 14, color: '#787774' }}>
              {editingContact
                ? 'Update this contact\'s information.'
                : 'Add someone new to your phone book.'}
            </DialogDescription>
          </DialogHeader>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Name */}
            <div>
              <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 6, display: 'block', color: '#37352F' }}>
                Name <span style={{ color: '#EB5757' }}>*</span>
              </label>
              <input
                placeholder="e.g. Dr. Smith, City Hall"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>

            {/* Phone + Email */}
            <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr' }}>
              <div>
                <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 6, display: 'block', color: '#37352F' }}>Phone</label>
                <input
                  placeholder="(555) 123-4567"
                  value={form.phone_number}
                  onChange={(e) => setForm((f) => ({ ...f, phone_number: e.target.value }))}
                  style={inputStyle}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
              </div>
              <div>
                <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 6, display: 'block', color: '#37352F' }}>Email</label>
                <input
                  placeholder="name@example.com"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  style={inputStyle}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
              </div>
            </div>

            {/* Company + Category */}
            <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr' }}>
              <div>
                <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 6, display: 'block', color: '#37352F' }}>Company</label>
                <input
                  placeholder="Organization or business"
                  value={form.company}
                  onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                  style={inputStyle}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
              </div>
              <div>
                <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 6, display: 'block', color: '#37352F' }}>Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as Category }))}
                  style={selectStyle}
                  onFocus={handleFocus as any}
                  onBlur={handleBlur as any}
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
              <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 6, display: 'block', color: '#37352F' }}>Notes</label>
              <textarea
                placeholder="Any details worth remembering..."
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
                style={textareaStyle}
                onFocus={handleFocus as any}
                onBlur={handleBlur as any}
              />
            </div>

            {/* Favorite Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, is_favorite: !f.is_favorite }))}
                style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <Star
                  style={{
                    height: 20,
                    width: 20,
                    color: form.is_favorite ? '#CB912F' : '#787774',
                    fill: form.is_favorite ? '#CB912F' : 'none',
                    transition: 'all 200ms ease',
                  }}
                />
                <span style={{ color: form.is_favorite ? '#37352F' : '#787774' }}>
                  {form.is_favorite ? 'Favorited' : 'Mark as favorite'}
                </span>
              </button>
            </div>
          </div>

          <DialogFooter style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <button
              onClick={() => setDialogOpen(false)}
              style={{
                padding: '6px 14px',
                fontSize: 14,
                fontWeight: 500,
                color: '#37352F',
                background: '#FFFFFF',
                border: '1px solid #E3E2DE',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '6px 14px',
                fontSize: 14,
                fontWeight: 500,
                color: '#FFFFFF',
                background: '#2383E2',
                border: 'none',
                borderRadius: 8,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving
                ? 'Saving...'
                : editingContact
                  ? 'Save Changes'
                  : 'Add Contact'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
