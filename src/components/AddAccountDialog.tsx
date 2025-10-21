import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AddAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AddAccountDialog = ({ open, onOpenChange }: AddAccountDialogProps) => {
  const [email, setEmail] = useState("");
  const [imapHost, setImapHost] = useState("");
  const [imapPort, setImapPort] = useState("993");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('email_accounts')
        .insert({
          user_id: user.id,
          email,
          imap_host: imapHost,
          imap_port: parseInt(imapPort),
          imap_username: username,
          imap_password: password,
        });

      if (error) throw error;

      toast.success("Email account added successfully");
      onOpenChange(false);
      
      // Trigger sync
      await supabase.functions.invoke('sync-emails', {
        body: { email }
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to add account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Email Account</DialogTitle>
          <DialogDescription>
            Connect your IMAP email account to start syncing emails
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="imap-host">IMAP Host</Label>
            <Input
              id="imap-host"
              placeholder="imap.gmail.com"
              value={imapHost}
              onChange={(e) => setImapHost(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="imap-port">IMAP Port</Label>
            <Input
              id="imap-port"
              type="number"
              value={imapPort}
              onChange={(e) => setImapPort(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Adding..." : "Add Account"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddAccountDialog;