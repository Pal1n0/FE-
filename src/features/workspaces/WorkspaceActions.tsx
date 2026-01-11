import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  softDeleteWorkspace,
  activateWorkspace,
  hardDeleteWorkspace,
} from "@/services/workspaceService";
import type { Workspace, HardDeleteConfirmation } from "@/types";
import { useInspectArchivedStore } from '../../store/useInspectArchivedStore';

interface WorkspaceActionsProps {
  workspace: Workspace;
  // Optional prop to indicate if the component is being rendered in a compact space (e.g., card)
  isCompact?: boolean;
}

export function WorkspaceActions({ workspace, isCompact }: WorkspaceActionsProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { isInspectingArchived, inspectedWorkspaceId, stopInspecting } = useInspectArchivedStore();

  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showHardDeleteConfirm, setShowHardDeleteConfirm] = useState(false);
  const [hardDeleteConfirmationInput, setHardDeleteConfirmationInput] =
    useState("");
  const [hardDeleteAdminCodeInput, setHardDeleteAdminCodeInput] = useState("");

  const canDelete = workspace?.user_permissions?.permissions?.can_delete;
  const isOwnerWithMembers = workspace?.user_permissions?.is_owner && workspace.member_count > 1;
  const disableHardDelete = !canDelete || isOwnerWithMembers;

  const softDeleteMutation = useMutation({
    mutationFn: (workspaceId: string) => softDeleteWorkspace(workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["workspace", workspace.id] });
      toast.success(t("workspaces.detail.archiveSuccess"));
      setShowArchiveConfirm(false);
    },
    onError: (error) => {
      toast.error(error.message || t("workspaces.detail.archiveFailed"));
    },
  });

  const activateMutation = useMutation({
    mutationFn: (workspaceId: string) => activateWorkspace(workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["workspace", workspace.id] });
      toast.success(t("workspaces.detail.activateSuccess"));
      if (isInspectingArchived && inspectedWorkspaceId === workspace.id) {
        stopInspecting();
      }
    },
    onError: (error) => {
      console.error("Activate Workspace Failed:", error); // Added detailed error logging
      toast.error(error.message || t("workspaces.detail.activateFailed"));
    },
  });

  const hardDeleteMutation = useMutation({
    mutationFn: ({
      workspaceId,
      confirmation,
    }: {
      workspaceId: string;
      confirmation: HardDeleteConfirmation;
    }) => hardDeleteWorkspace(workspaceId, confirmation),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["workspace", workspace.id] });
      navigate("/settings/workspaces");
      toast.success(t("workspaces.detail.hardDeleteSuccess"));
      setShowHardDeleteConfirm(false);
    },
    onError: (error: any) => {
      const errorMessage =
        error.response?.data?.detail ||
        error.message ||
        t("workspaces.detail.hardDeleteFailed");
      toast.error(errorMessage);
    },
  });

  const deletePermissionTooltip = t("workspaces.detail.noDeletePermissionTooltip");
  const ownerWithMembersTooltip = t("workspaces.detail.ownerDeletePrerequisite");

  console.log("WorkspaceActions: canDelete", canDelete, "workspace.id", workspace?.id, "activateMutation.isPending", activateMutation.isPending); // Added debug log

  return (
    <div className={isCompact ? "flex items-center space-x-2" : "flex flex-col space-y-4"}>
      {workspace?.is_active ? (
        // Archive Button
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertDialog open={showArchiveConfirm} onOpenChange={setShowArchiveConfirm}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-fit border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600"
                    disabled={!canDelete || softDeleteMutation.isPending}
                  >
                    {t("workspaces.detail.dangerZone.archiveButton")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {t("workspaces.detail.dangerZone.archiveConfirmTitle")}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("workspaces.detail.dangerZone.archiveConfirmDescription", {
                        workspaceName: workspace?.name,
                      })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={softDeleteMutation.isPending}>
                      {t("common.cancel")}
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => softDeleteMutation.mutate(workspace.id)}
                      disabled={softDeleteMutation.isPending}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      {softDeleteMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {t("workspaces.detail.dangerZone.archiveConfirmAction")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </TooltipTrigger>
            {!canDelete && <TooltipContent>{deletePermissionTooltip}</TooltipContent>}
          </Tooltip>
        </TooltipProvider>
      ) : (
        // Activate Button
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className="w-fit border-green-500 text-green-500 hover:bg-green-50 hover:text-green-600"
                onClick={() => activateMutation.mutate(workspace.id)}
                disabled={!canDelete || activateMutation.isPending}
              >
                {activateMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t("workspaces.detail.dangerZone.activateButton")}
              </Button>
            </TooltipTrigger>
            {!canDelete && <TooltipContent>{deletePermissionTooltip}</TooltipContent>}
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Hard Delete Section */}
      {!isCompact && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertDialog
                open={showHardDeleteConfirm}
                onOpenChange={setShowHardDeleteConfirm}
              >
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-fit" disabled={disableHardDelete}>
                    {t("workspaces.detail.dangerZone.hardDeleteButton")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {t("workspaces.detail.dangerZone.hardDeleteConfirmTitle")}
                    </AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="space-y-4">
                        <p>
                          {t("workspaces.detail.dangerZone.hardDeleteConfirmDescription1")}
                        </p>
                        <p>
                          {t("workspaces.detail.dangerZone.hardDeleteConfirmDescription2", {
                            workspaceName: workspace?.name,
                          })}
                        </p>
                        <Input
                          placeholder={t(
                            "workspaces.detail.dangerZone.hardDeleteConfirmPlaceholder"
                          )}
                          value={hardDeleteConfirmationInput}
                          onChange={(e) => setHardDeleteConfirmationInput(e.target.value)}
                          disabled={hardDeleteMutation.isPending || isOwnerWithMembers}
                        />
                        {isOwnerWithMembers && (
                          <p className="text-red-500 text-sm">
                            {ownerWithMembersTooltip}
                          </p>
                        )}
                        {workspace?.user_permissions?.is_admin &&
                          !workspace?.user_permissions?.is_owner && (
                            <div className="space-y-2">
                              <p className="text-red-500 font-semibold">
                                {t(
                                  "workspaces.detail.dangerZone.adminConfirmMessage",
                                  { adminCode: `admin-delete-${workspace.id}` }
                                )}
                              </p>
                              <Input
                                placeholder={`admin-delete-${workspace.id}`}
                                value={hardDeleteAdminCodeInput}
                                onChange={(e) => setHardDeleteAdminCodeInput(e.target.value)}
                                disabled={hardDeleteMutation.isPending}
                              />
                            </div>
                          )}
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={hardDeleteMutation.isPending}>
                      {t("common.cancel")}
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        const confirmation: HardDeleteConfirmation = {
                          standard: true,
                          workspace_name: hardDeleteConfirmationInput,
                        };
                        if (
                          workspace?.user_permissions?.is_admin && // Updated to user_permissions
                          !workspace?.user_permissions?.is_owner // Updated to user_permissions
                        ) {
                          confirmation.admin = hardDeleteAdminCodeInput;
                        }
                        hardDeleteMutation.mutate({
                          workspaceId: workspace.id,
                          confirmation,
                        });
                      }}
                      disabled={
                        hardDeleteMutation.isPending ||
                        hardDeleteConfirmationInput !== workspace?.name ||
                        disableHardDelete || // Use combined disable state
                        (workspace?.user_permissions?.is_admin && // Updated to user_permissions
                          !workspace?.user_permissions?.is_owner && // Updated to user_permissions
                          hardDeleteAdminCodeInput !== `admin-delete-${workspace.id}`)
                      }
                      className="bg-red-500 hover:bg-red-600"
                    >
                      {hardDeleteMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {t("workspaces.detail.dangerZone.hardDeleteConfirmAction")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </TooltipTrigger>
            {!canDelete && <TooltipContent>{deletePermissionTooltip}</TooltipContent>}
            {canDelete && isOwnerWithMembers && <TooltipContent>{ownerWithMembersTooltip}</TooltipContent>}
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
