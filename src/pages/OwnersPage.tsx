import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { OwnerFormDialog } from '@/components/owners/OwnerFormDialog';
import { OwnerStatementDialog } from '@/components/owners/OwnerStatementDialog';
import { useOwners, useDeleteOwner, Owner } from '@/hooks/useOwners';
import {
  Search, Mail, Phone, MapPin, Pencil, Trash2, Loader2,
  FileText, UserCheck, AlertCircle, ReceiptText,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const OwnersPage = () => {
  const { data: owners, isLoading } = useOwners();
  const deleteMutation = useDeleteOwner();

  const [searchTerm, setSearchTerm] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editOwner, setEditOwner] = useState<Owner | null>(null);
  const [deleteOwner, setDeleteOwner] = useState<Owner | null>(null);
  const [statementOwner, setStatementOwner] = useState<Owner | null>(null);

  const filtered = (owners ?? []).filter(o =>
    o.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (o.email ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (o.document_number ?? '').includes(searchTerm)
  );

  const handleEdit = (o: Owner) => {
    setEditOwner(o);
    setFormOpen(true);
  };

  const handleNew = () => {
    setEditOwner(null);
    setFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteOwner) return;
    await deleteMutation.mutateAsync(deleteOwner.id);
    setDeleteOwner(null);
  };

  return (
    <MainLayout
      title="Propietarios"
      subtitle={`${filtered.length} propietario${filtered.length !== 1 ? 's' : ''} registrado${filtered.length !== 1 ? 's' : ''}`}
      action={{ label: '+ Nuevo Propietario', onClick: handleNew }}
    >
      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nombre, email o documento..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
          />
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* Grid */}
      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((owner, idx) => {
            const initials = owner.full_name
              .split(' ')
              .map(w => w[0])
              .join('')
              .substring(0, 2)
              .toUpperCase();

            return (
              <div
                key={owner.id}
                className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-all duration-200 animate-scale-in opacity-0 group"
                style={{ animationDelay: `${idx * 40}ms`, animationFillMode: 'forwards' }}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary">{initials}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground leading-tight">{owner.full_name}</h3>
                      {owner.document_number && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {owner.document_type || 'CI'}: {owner.document_number}
                        </p>
                      )}
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setStatementOwner(owner)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                      title="Estado de Cuenta"
                    >
                      <ReceiptText className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Estado de Cuenta</span>
                    </button>
                    <button
                      onClick={() => handleEdit(owner)}
                      className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                      title="Editar"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteOwner(owner)}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Contact info */}
                <div className="space-y-2">
                  {owner.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{owner.email}</span>
                    </div>
                  )}
                  {owner.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{owner.phone}</span>
                    </div>
                  )}
                  {owner.address && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{owner.address}</span>
                    </div>
                  )}
                </div>

                {owner.notes && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground line-clamp-2">{owner.notes}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <UserCheck className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {searchTerm ? 'No se encontraron propietarios' : 'Sin propietarios registrados'}
          </h3>
          <p className="text-muted-foreground text-sm mb-6">
            {searchTerm
              ? 'Intentá ajustar la búsqueda'
              : 'Agregá propietarios para asociarlos a propiedades y contratos'}
          </p>
          {!searchTerm && (
            <button
              onClick={handleNew}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <UserCheck className="w-4 h-4" />
              Agregar primer propietario
            </button>
          )}
        </div>
      )}

      {/* Form dialog */}
      <OwnerFormDialog
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setEditOwner(null); }}
        owner={editOwner}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteOwner} onOpenChange={v => { if (!v) setDeleteOwner(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              Eliminar propietario
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de eliminar a <strong>{deleteOwner?.full_name}</strong>?
              Esta acción no se puede deshacer. Las propiedades asociadas quedarán sin propietario asignado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Owner statement dialog */}
      <OwnerStatementDialog
        open={!!statementOwner}
        onOpenChange={v => { if (!v) setStatementOwner(null); }}
        owner={statementOwner}
      />
    </MainLayout>
  );
};

export default OwnersPage;
