import { useState, useEffect } from 'react';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

const emptyForm = {
  isbn: '',
  title: '',
  description: '',
  publisher: '',
  publishedYear: '',
  language: '',
  coverUrl: '',
  initialCopies: '1',
};

export default function BookForm({ initialValues, onSubmit, onCancel, isSubmitting, mode }) {
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (initialValues) {
      setForm({
        isbn: initialValues.isbn || '',
        title: initialValues.title || '',
        description: initialValues.description || '',
        publisher: initialValues.publisher || '',
        publishedYear: initialValues.publishedYear ? String(initialValues.publishedYear) : '',
        language: initialValues.language || '',
        coverUrl: initialValues.coverUrl || '',
        initialCopies: '1',
      });
    } else {
      setForm(emptyForm);
    }
  }, [initialValues]);

  const handleChange = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setFieldErrors((fe) => ({ ...fe, [field]: undefined }));
  };

  const validate = () => {
    const errors = {};
    if (!form.isbn.trim() || form.isbn.trim().length < 10) errors.isbn = 'ISBN must be at least 10 characters';
    if (!form.title.trim()) errors.title = 'Title is required';
    if (form.publishedYear && !/^\d{4}$/.test(form.publishedYear)) {
      errors.publishedYear = 'Enter a 4-digit year';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      isbn: form.isbn.trim(),
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      publisher: form.publisher.trim() || undefined,
      publishedYear: form.publishedYear ? Number(form.publishedYear) : undefined,
      language: form.language.trim() || undefined,
      coverUrl: form.coverUrl.trim() || undefined,
    };

    onSubmit(payload, mode === 'create' ? Number(form.initialCopies) || 0 : null);
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Input id="isbn" label="ISBN" value={form.isbn} onChange={handleChange('isbn')} error={fieldErrors.isbn} />
      <Input id="title" label="Title" value={form.title} onChange={handleChange('title')} error={fieldErrors.title} />
      <Input id="publisher" label="Publisher (optional)" value={form.publisher} onChange={handleChange('publisher')} />
      <Input
        id="publishedYear"
        label="Published year (optional)"
        value={form.publishedYear}
        onChange={handleChange('publishedYear')}
        error={fieldErrors.publishedYear}
      />
      <Input id="language" label="Language (optional)" value={form.language} onChange={handleChange('language')} />
      <Input id="coverUrl" label="Cover URL (optional)" value={form.coverUrl} onChange={handleChange('coverUrl')} />
      <div className="sm:col-span-2">
        <label htmlFor="description" className="text-sm font-medium text-ink">
          Description (optional)
        </label>
        <textarea
          id="description"
          rows={3}
          value={form.description}
          onChange={handleChange('description')}
          className="mt-1.5 w-full rounded-card border border-hairline bg-white px-3 py-2 text-sm text-ink focus:border-brass"
        />
      </div>

      {mode === 'create' && (
        <Input
          id="initialCopies"
          label="Number of copies to add"
          type="number"
          min="0"
          value={form.initialCopies}
          onChange={handleChange('initialCopies')}
        />
      )}

      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : mode === 'create' ? 'Create book' : 'Save changes'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}