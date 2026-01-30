import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Shield, 
  Settings2, 
  BarChart3, 
  MessageSquare, 
  Users,
  Crown,
  Loader2
} from 'lucide-react';
import { CommunityPermissionType, useCommunityPermissions } from '@/hooks/useCommunityPermissions';

interface CommunityPermissionsDialogProps {
  communityId: string;
  creatorId: string | null;
}

const PERMISSION_CONFIG: {
  type: CommunityPermissionType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    type: 'edit_community',
    label: 'Edit Community',
    description: 'Can edit community name, description, and cover image',
    icon: Settings2,
  },
  {
    type: 'create_polls',
    label: 'Create Polls',
    description: 'Can create and manage polls in the community',
    icon: BarChart3,
  },
  {
    type: 'moderate_discussions',
    label: 'Moderate Discussions',
    description: 'Can delete any discussion messages',
    icon: MessageSquare,
  },
  {
    type: 'manage_members',
    label: 'Manage Members',
    description: 'Can remove members from the community',
    icon: Users,
  },
];

export function CommunityPermissionsDialog({ communityId, creatorId }: CommunityPermissionsDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  
  const {
    membersWithPermissions,
    grantPermission,
    revokePermission,
  } = useCommunityPermissions(communityId);

  const handleTogglePermission = async (
    userId: string, 
    permission: CommunityPermissionType, 
    hasPermission: boolean
  ) => {
    const key = `${userId}-${permission}`;
    setLoadingStates(prev => ({ ...prev, [key]: true }));

    try {
      let success: boolean;
      if (hasPermission) {
        success = await revokePermission(userId, permission);
      } else {
        success = await grantPermission(userId, permission);
      }

      if (success) {
        toast({ 
          title: hasPermission ? 'Permission revoked' : 'Permission granted',
        });
      } else {
        toast({ 
          title: 'Failed to update permission', 
          variant: 'destructive' 
        });
      }
    } catch (error) {
      toast({ 
        title: 'Error updating permission', 
        variant: 'destructive' 
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, [key]: false }));
    }
  };

  // Filter out the creator from the members list (creator has all permissions by default)
  const managableMembers = membersWithPermissions.filter(m => m.user_id !== creatorId);
  const selectedMember = managableMembers.find(m => m.user_id === selectedMemberId);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) setSelectedMemberId(null);
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Shield className="mr-2 h-4 w-4" />
          Manage Permissions
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Member Permissions
          </DialogTitle>
        </DialogHeader>

        {managableMembers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No members to manage permissions for.</p>
            <p className="text-sm">Invite members to your community first.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Member Selection Dropdown */}
            <div className="space-y-2">
              <Label>Select Member</Label>
              <Select
                value={selectedMemberId || ''}
                onValueChange={(value) => setSelectedMemberId(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a member..." />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  {managableMembers.map((member) => (
                    <SelectItem key={member.user_id} value={member.user_id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={member.avatar_url || ''} />
                          <AvatarFallback className="text-xs">
                            {member.full_name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span>{member.full_name || member.username || 'Anonymous'}</span>
                        {member.role === 'admin' && (
                          <Badge variant="secondary" className="gap-1 text-xs py-0">
                            <Crown className="h-2.5 w-2.5" />
                            Admin
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selected Member Permissions */}
            {selectedMember && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-3 pb-2">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={selectedMember.avatar_url || ''} />
                      <AvatarFallback className="gradient-primary text-white">
                        {selectedMember.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{selectedMember.full_name || 'Anonymous'}</p>
                      {selectedMember.username && !/^\d+$/.test(selectedMember.username) && (
                        <p className="text-xs text-muted-foreground">@{selectedMember.username}</p>
                      )}
                    </div>
                  </div>

                  {PERMISSION_CONFIG.map((config) => {
                    const hasPermission = selectedMember.permissions.includes(config.type);
                    const key = `${selectedMember.user_id}-${config.type}`;
                    const isLoading = loadingStates[key];
                    const Icon = config.icon;

                    return (
                      <div 
                        key={config.type}
                        className="flex items-start justify-between gap-4 p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-start gap-3">
                          <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                          <div className="space-y-0.5">
                            <Label 
                              htmlFor={key}
                              className="text-sm font-medium cursor-pointer"
                            >
                              {config.label}
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              {config.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isLoading && (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                          <Switch
                            id={key}
                            checked={hasPermission}
                            onCheckedChange={() => 
                              handleTogglePermission(selectedMember.user_id, config.type, hasPermission)
                            }
                            disabled={isLoading}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {!selectedMember && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Select a member to manage their permissions
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
