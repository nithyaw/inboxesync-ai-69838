import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogOut, Search, Plus } from "lucide-react";
import { toast } from "sonner";
import EmailList from "./EmailList";
import EmailDetail from "./EmailDetail";
import AddAccountDialog from "./AddAccountDialog";
import { useNavigate } from "react-router-dom";

export interface Email {
  id: string;
  from_address: string;
  subject: string;
  body: string;
  received_at: string;
  category: string;
  is_read: boolean;
  account_id: string;
}

const EmailInbox = () => {
  const navigate = useNavigate();
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmails();
    
    const channel = supabase
      .channel('emails-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'emails'
        },
        () => {
          fetchEmails();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchEmails = async () => {
    const { data, error } = await supabase
      .from('emails')
      .select('*')
      .order('received_at', { ascending: false });

    if (error) {
      toast.error("Failed to fetch emails");
      console.error(error);
    } else {
      setEmails(data || []);
    }
    setLoading(false);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchEmails();
      return;
    }

    const { data, error } = await supabase
      .from('emails')
      .select('*')
      .textSearch('search_vector', searchQuery)
      .order('received_at', { ascending: false });

    if (error) {
      toast.error("Search failed");
      console.error(error);
    } else {
      setEmails(data || []);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Onebox</h1>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => setAddAccountOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Account
            </Button>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="mt-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search emails..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button onClick={handleSearch}>Search</Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        <EmailList
          emails={emails}
          selectedEmail={selectedEmail}
          onSelectEmail={setSelectedEmail}
          loading={loading}
        />
        <EmailDetail email={selectedEmail} />
      </div>

      <AddAccountDialog open={addAccountOpen} onOpenChange={setAddAccountOpen} />
    </div>
  );
};

export default EmailInbox;