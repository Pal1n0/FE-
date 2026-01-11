import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Loader2, Pencil, Archive } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import apiClient from "@/services/apiClient";
import { fetchWorkspaceMembershipInfo, updateWorkspace, updateWorkspaceSettings } from '@/services/workspaceService';
import type { Workspace } from '@/types';
import { WorkspaceActions } from '@/features/workspaces/WorkspaceActions';
import { useInspectArchivedStore } from '@/store/useInspectArchivedStore';
import useUIStore from '@/store/useUIStore';
import useWorkspaceStore from '@/store/useWorkspaceStore'; 

// 1. Zjednodušené definície typov pre lokálny state
interface SettingsState {
  domestic_currency: string;
  fiscal_year_start: string | number; // Povolíme aj string aj number kvôli formuláru
  display_mode: string;
  accounting_mode: boolean;
}

interface Member {
  user_id: number;
  username: string;
  role: string;
  is_owner: boolean;
  is_admin: boolean;
  joined_at: string;
}

interface MembersData {
  workspace_id: string;
  workspace_name: string;
  members: Member[];
  total_members: number;
}

interface UserPermissionsData {
  workspace_id: string;
  workspace_name: string;
  user_id: number;
  role: 'owner' | 'editor' | 'viewer' | 'admin';
  is_owner: boolean;
  is_admin: boolean;
  permissions: {
    can_edit: boolean;
    can_delete: boolean;
    can_manage_users: boolean;
    can_impersonate: boolean;
  };
}

export function WorkspaceDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // --- STORES ---
  const setDynamicSegmentName = useUIStore((state) => state.setDynamicSegmentName);
  const startInspecting = useInspectArchivedStore((state) => state.startInspecting);
  const isInspectingArchived = useInspectArchivedStore((state) => state.isInspectingArchived);
  const inspectedWorkspaceId = useInspectArchivedStore((state) => state.inspectedWorkspaceId);
  const setCurrentWorkspace = useWorkspaceStore((state) => state.setCurrentWorkspace);

  const [isEditingDetails, setIsEditingDetails] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [domesticCurrency, setDomesticCurrency] = useState("");
  const [fiscalYearStart, setFiscalYearStart] = useState<number | string>("");
  const [displayMode, setDisplayMode] = useState("");
  const [accountingMode, setAccountingMode] = useState(false);

  // 2. Oprava typovania pre initialSettings
  const [initialSettings, setInitialSettings] = useState<SettingsState>({
    domestic_currency: "",
    fiscal_year_start: "",
    display_mode: "",
    accounting_mode: false,
  });
  
  const [isSettingsDirty, setIsSettingsDirty] = useState(false);
  const [isDetailsDirty, setIsDetailsDirty] = useState(false); // Pridané chýbajúce

  // --- QUERIES ---
  const { data: workspace, isPending: isWorkspaceLoading, error: workspaceError } = useQuery<Workspace>({
    queryKey: ["workspace", id],
    queryFn: async () => {
      const response = await apiClient.get(`/api/workspaces/${id}/`, {
        params: { include_archived: true }
      });
      return response.data;
    },
    enabled: !!id,
    retry: false
  });

  const { data: membersData, isPending: areMembersLoading } = useQuery<MembersData>({
    queryKey: ["workspaceMembers", id],
    queryFn: () => fetchWorkspaceMembershipInfo(id!),
    enabled: !!id && !!workspace,
  });

  const { data: userPermissionsData } = useQuery<UserPermissionsData>({
    queryKey: ["workspaceUserPermissions", id],
    queryFn: () => fetchWorkspaceMembershipInfo(id!),
    enabled: !!id,
  });

  // --- EFFECTS ---
  useEffect(() => {
    if (workspace) {
      setName(workspace.name);
      setDescription(workspace.description || "");
      
      // 3. Bezpečný prístup k settings pomocou ?. (optional chaining)
      if (workspace.settings) {
        setDomesticCurrency(workspace.settings.domestic_currency);
        setFiscalYearStart(workspace.settings.fiscal_year_start);
        setDisplayMode(workspace.settings.display_mode);
        setAccountingMode(workspace.settings.accounting_mode);

        // Tu bola chyba - teraz to sedí s definíciou SettingsState
        setInitialSettings({
          domestic_currency: workspace.settings.domestic_currency,
          fiscal_year_start: workspace.settings.fiscal_year_start, // Už netreba String(), interface to povolí
          display_mode: workspace.settings.display_mode,
          accounting_mode: workspace.settings.accounting_mode,
        });
      }
      setDynamicSegmentName(id!, workspace.name);
    }
  }, [workspace, id, setDynamicSegmentName]);

  // Efekt na kontrolu zmien v DETAILOCH
  useEffect(() => {
    if (workspace) {
      const isChanged =
        name !== workspace.name ||
        description !== (workspace.description || "");
      setIsDetailsDirty(isChanged);
    }
  }, [name, description, workspace]);

  // Efekt na kontrolu zmien v NASTAVENIACH
  useEffect(() => {
    // 4. Oprava prístupu k settings
    if (workspace?.settings) {
      const s = workspace.settings;
      const isChanged =
        String(domesticCurrency) !== String(s.domestic_currency) ||
        String(fiscalYearStart) !== String(s.fiscal_year_start) ||
        String(displayMode) !== String(s.display_mode) ||
        Boolean(accountingMode) !== Boolean(s.accounting_mode);

      setIsSettingsDirty(isChanged);
    }
  }, [domesticCurrency, fiscalYearStart, displayMode, accountingMode, workspace]);

  // --- MUTATIONS ---
  const updateWorkspaceMutation = useMutation({
    mutationFn: (data: { name: string; description: string }) => updateWorkspace(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace", id] });
      toast.success(t('workspaces.detail.updateSuccess'));
      setIsEditingDetails(false);
    },
    onError: (error: any) => toast.error(error.message || t('workspaces.detail.updateFailed')),
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (data: { domestic_currency: string; fiscal_year_start: number; display_mode: string; accounting_mode: boolean }) =>
      updateWorkspaceSettings(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace", id] });
      toast.success(t('workspaces.detail.settingsUpdateSuccess'));
      
      // Update initial settings po úspešnom uložení
      // 5. Opäť bezpečný prístup cez ?.
      if (workspace?.settings) {
          setInitialSettings({
            domestic_currency: domesticCurrency,
            fiscal_year_start: fiscalYearStart,
            display_mode: displayMode,
            accounting_mode: accountingMode,
          });
          setIsSettingsDirty(false);
      }
    },
    onError: (error: any) => toast.error(error.message || t('workspaces.detail.settingsUpdateFailed')),
  });

  // --- HANDLERS ---
  const handleSaveDetails = () => updateWorkspaceMutation.mutate({ name, description });
  
  const handleSaveSettings = () => {
    updateSettingsMutation.mutate({
      domestic_currency: domesticCurrency,
      fiscal_year_start: Number(fiscalYearStart),
      display_mode: displayMode,
      accounting_mode: accountingMode,
    });
  };

  // Handler pre zmenu nastavení (zjednodušený, špinavosť kontroluje useEffect)
  const handleSettingChange = (
    field: 'domestic_currency' | 'fiscal_year_start' | 'display_mode' | 'accounting_mode',
    value: string | boolean | number
  ) => {
    if (field === 'domestic_currency') setDomesticCurrency(value as string);
    if (field === 'fiscal_year_start') setFiscalYearStart(value as number);
    if (field === 'display_mode') setDisplayMode(value as string);
    if (field === 'accounting_mode') setAccountingMode(value as boolean);
  };

  // --- RENDER ---
  if (isWorkspaceLoading) return <div className="flex justify-center items-center h-full p-10"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (workspaceError || !workspace) return <div className="flex justify-center items-center h-full p-10">{t('workspaces.detail.loadError')}</div>;

  // 6. Bezpečný prístup k options
  const settingsOptions = workspace.settings?.options;
  const canEdit = userPermissionsData?.permissions?.can_edit;
  const isArchived = !workspace.is_active;

  const membersByRole = membersData?.members?.reduce((acc, member) => {
    const role = member.role || 'viewer';
    if (!acc[role]) acc[role] = [];
    acc[role].push(member);
    return acc;
  }, {} as Record<string, Member[]>) || {};

  const workspaceWithPermissions = { ...workspace, user_permissions: userPermissionsData };

  return (
    <div className="p-6 space-y-6">
      {/* HEADER + TLAČIDLO INSPECT */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('workspaces.detail.title')}</h1>
        
        {isArchived && (
          <Button
            variant="outline"
            className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
            onClick={() => {
              startInspecting(id!);
              setCurrentWorkspace(workspace);
              navigate('/dashboard');
            }}
          >
            <Archive className="mr-2 h-4 w-4" />
            {t("workspaces.inspect_archived")}
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        
        {/* --- DETAILY KARTA --- */}
        <Card className={isArchived ? "border-red-400 bg-red-50 dark:bg-red-950/20 dark:border-red-700" : ""}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                {/* ARCHIVED BADGE */}
                {isArchived && (
                    <div className="mb-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {t('workspaces.archived_status')}
                    </div>
                )}
                
                {/* EDIT MÓD */}
                {isEditingDetails ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="workspaceName">{t('workspaces.detail.name')}</Label>
                      <Input
                        id="workspaceName"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={updateWorkspaceMutation.isPending}
                      />
                    </div>
                    <div>
                      <Label htmlFor="workspaceDescription">{t('workspaces.detail.description')}</Label>
                      <Textarea
                        id="workspaceDescription"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={updateWorkspaceMutation.isPending}
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                        <Button onClick={handleSaveDetails} disabled={updateWorkspaceMutation.isPending || !isDetailsDirty}>
                            {updateWorkspaceMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : t('workspaces.detail.save')}
                        </Button>
                        <Button variant="ghost" onClick={() => setIsEditingDetails(false)}>{t('common.cancel')}</Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      {workspace.name}
                    </h2>
                    <p className="text-muted-foreground mt-2 whitespace-pre-wrap">
                        {workspace.description || t('workspaces.no_description')}
                    </p>
                  </div>
                )}
              </div>
              
              {canEdit && !isArchived && !isEditingDetails && (
                <Button variant="ghost" size="icon" onClick={() => setIsEditingDetails(true)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
             <p className="text-sm text-muted-foreground mt-4">
                {t('workspaces.detail.createdAt')} {format(new Date(workspace.created_at), "PPP")}
             </p>
          </CardContent>
        </Card>

        {/* --- SETTINGS KARTA --- */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('workspaces.detail.settingsTitle')}</CardTitle>
            <CardDescription>{t('workspaces.detail.settingsDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('workspaces.detail.domesticCurrency')}</Label>
                <Select value={domesticCurrency} onValueChange={(v) => handleSettingChange('domestic_currency', v)} disabled={!canEdit || isArchived}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                                         {settingsOptions?.domestic_currency.map(([val]) => (
                                          <SelectItem key={val} value={val}>{t('currencies.' + val)}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                    
                                  <div className="space-y-2">
                                    <Label>{t('workspaces.detail.fiscalYearStartMonth')}</Label>
                                    <Select value={String(fiscalYearStart)} onValueChange={(v) => handleSettingChange('fiscal_year_start', Number(v))} disabled={!canEdit || isArchived}>
                                      <SelectTrigger><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                         {settingsOptions?.fiscal_year_start.map(([val]) => (
                                          <SelectItem key={val} value={String(val)}>{t('months.' + val)}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                    
                                  <div className="space-y-2">
                                     <Label>{t('workspaces.detail.displayMode')}</Label>
                                     <Select value={displayMode} onValueChange={(v) => handleSettingChange('display_mode', v)} disabled={!canEdit || isArchived}>
                                      <SelectTrigger><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                         {settingsOptions?.display_mode.map(([val]) => (
                                          <SelectItem key={val} value={val}>{t('displayModes.' + val)}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>              </div>

              <div className="flex items-center space-x-2 pt-8">
                <Switch 
                    id="acc-mode" 
                    checked={accountingMode} 
                    onCheckedChange={(v) => handleSettingChange('accounting_mode', v)} 
                    disabled={!canEdit || isArchived} 
                />
                <Label htmlFor="acc-mode">{t('workspaces.detail.accountingMode')}</Label>
              </div>
            </div>

            {canEdit && !isArchived && (
                <div className="mt-6">
                    <Button onClick={handleSaveSettings} disabled={updateSettingsMutation.isPending || !isSettingsDirty}>
                        {updateSettingsMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : t('workspaces.detail.save')}
                    </Button>
                </div>
            )}
            {isArchived && (
                <div className="mt-6 text-sm text-gray-500 italic">
                    {t('workspaces.detail.settings_read_only')}
                </div>
            )}
          </CardContent>
        </Card>

        {/* --- MEMBERS KARTA --- */}
        {workspace?.member_count > 1 && userPermissionsData?.permissions?.can_manage_users && (
             <Card className="lg:col-span-3">
                <CardHeader>
                    <CardTitle>{t('workspaces.detail.membersTitle')}</CardTitle>
                    <CardDescription>{t('workspaces.detail.membersDescription', { count: membersData?.total_members || 0 })}</CardDescription>
                </CardHeader>
                <CardContent>
                    {areMembersLoading ? <Loader2 className="h-6 w-6 animate-spin"/> : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {Object.entries(membersByRole).map(([role, members]) => (
                                <div key={role} className="border p-3 rounded bg-gray-50">
                                    <h4 className="font-bold mb-2 capitalize">{role} ({members.length})</h4>
                                    <ul className="text-sm space-y-1">
                                        {members.map(m => <li key={m.user_id}>{m.username}</li>)}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
             </Card>
        )}
      
        {/* --- ACTIONS --- */}
        <div className="lg:col-span-3">
             <WorkspaceActions workspace={workspaceWithPermissions as any} />
        </div>
      </div>
    </div>
  );
}