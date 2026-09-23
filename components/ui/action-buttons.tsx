import { Button } from "@/components/ui/button";
import { Edit, Trash2, FileDown, AlertCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ActionButtonsProps {
  onEdit?: () => void;
  onDelete?: (id: string | number) => Promise<void>;
  onDownloadPDF?: () => void;
  itemId: string | number;
  loading?: boolean;
  deleteLabel?: string;
}

export function ActionButtons({
  onEdit,
  onDelete,
  onDownloadPDF,
  itemId,
  loading = false,
  deleteLabel = "Tem certeza que deseja excluir este item?",
}: ActionButtonsProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(itemId);
      setShowDeleteDialog(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        {onEdit && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onEdit}
            disabled={loading || isDeleting}
            title="Editar"
            className="hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950"
          >
            <Edit className="h-4 w-4" />
          </Button>
        )}

        {onDownloadPDF && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onDownloadPDF}
            disabled={loading || isDeleting}
            title="Baixar PDF"
            className="hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-950"
          >
            <FileDown className="h-4 w-4" />
          </Button>
        )}

        {onDelete && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowDeleteDialog(true)}
            disabled={loading || isDeleting}
            title="Excluir"
            className="hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <AlertDialogTitle>Excluir item</AlertDialogTitle>
            </div>
            <AlertDialogDescription>{deleteLabel}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
