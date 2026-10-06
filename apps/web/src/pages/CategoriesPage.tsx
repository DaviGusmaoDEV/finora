import { useEffect, useState, type FormEvent } from 'react';
import { FolderTree, Plus } from 'lucide-react';
import { Button, Card, EmptyState, Modal } from '../components/ui';
import { apiFetch } from '../lib/api';
type Category = {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  parentId: string | null;
  children?: Category[];
};
export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'EXPENSE', parentId: '' });
  const load = async () => setCategories(await apiFetch<Category[]>('/categories'));
  useEffect(() => {
    void load();
  }, []);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await apiFetch('/categories', {
      method: 'POST',
      body: JSON.stringify({ ...form, parentId: form.parentId || null }),
    });
    setOpen(false);
    setForm({ name: '', type: 'EXPENSE', parentId: '' });
    await load();
  };
  const render = (type: Category['type']) =>
    categories
      .filter((category) => category.type === type && !category.parentId)
      .map((category) => (
        <div className="category-tree__item" key={category.id}>
          <strong>{category.name}</strong>
          {category.children?.map((child) => (
            <span key={child.id}>↳ {child.name}</span>
          ))}
        </div>
      ));
  return (
    <div>
      <div className="page-header">
        <div>
          <p className="page-header__eyebrow">Organização</p>
          <h1>Categorias</h1>
          <p className="page-header__description">
            Uma estrutura simples para separar receitas e despesas com clareza.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus size={17} /> Nova categoria
        </Button>
      </div>
      {categories.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FolderTree />}
            title="Nenhuma categoria cadastrada"
            description="Suas categorias aparecerão aqui depois do onboarding."
            action={<Button onClick={() => setOpen(true)}>Criar categoria</Button>}
          />
        </Card>
      ) : (
        <div className="dashboard-grid dashboard-grid--equal">
          <Card>
            <h2 className="dashboard-card__title">Despesas</h2>
            <div className="category-tree">{render('EXPENSE')}</div>
          </Card>
          <Card>
            <h2 className="dashboard-card__title">Receitas</h2>
            <div className="category-tree">{render('INCOME')}</div>
          </Card>
        </div>
      )}
      <Modal open={open} title="Nova categoria" onClose={() => setOpen(false)}>
        <form className="auth-form" onSubmit={submit}>
          <label className="form-field">
            <span>Nome</span>
            <input
              required
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </label>
          <label className="form-field">
            <span>Tipo</span>
            <select
              value={form.type}
              onChange={(event) => setForm({ ...form, type: event.target.value })}
            >
              <option value="EXPENSE">Despesa</option>
              <option value="INCOME">Receita</option>
            </select>
          </label>
          <label className="form-field">
            <span>Subcategoria de (opcional)</span>
            <select
              value={form.parentId}
              onChange={(event) => setForm({ ...form, parentId: event.target.value })}
            >
              <option value="">Categoria principal</option>
              {categories
                .filter((item) => item.type === form.type && !item.parentId)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </select>
          </label>
          <Button type="submit">Salvar categoria</Button>
        </form>
      </Modal>
    </div>
  );
}
