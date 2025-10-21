import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Email } from "./EmailInbox";
import { Loader2, Mail } from "lucide-react";

interface EmailListProps {
  emails: Email[];
  selectedEmail: Email | null;
  onSelectEmail: (email: Email) => void;
  loading: boolean;
}

const categoryColors = {
  interested: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  meeting_booked: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  not_interested: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  spam: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
  out_of_office: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
  uncategorized: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20",
};

const categoryLabels = {
  interested: "Interested",
  meeting_booked: "Meeting Booked",
  not_interested: "Not Interested",
  spam: "Spam",
  out_of_office: "Out of Office",
  uncategorized: "Uncategorized",
};

const EmailList = ({ emails, selectedEmail, onSelectEmail, loading }: EmailListProps) => {
  if (loading) {
    return (
      <div className="flex w-96 items-center justify-center border-r bg-card">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex w-96 flex-col items-center justify-center border-r bg-card p-8 text-center">
        <Mail className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="mb-2 text-lg font-semibold">No emails yet</h3>
        <p className="text-sm text-muted-foreground">
          Add an email account to start syncing your emails
        </p>
      </div>
    );
  }

  return (
    <div className="w-96 border-r bg-card">
      <ScrollArea className="h-full">
        <div className="divide-y">
          {emails.map((email) => (
            <button
              key={email.id}
              onClick={() => onSelectEmail(email)}
              className={cn(
                "w-full px-4 py-4 text-left transition-colors hover:bg-accent",
                selectedEmail?.id === email.id && "bg-accent",
                !email.is_read && "font-semibold"
              )}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <span className="truncate text-sm">{email.from_address}</span>
                <Badge
                  variant="outline"
                  className={cn("shrink-0 text-xs", categoryColors[email.category as keyof typeof categoryColors])}
                >
                  {categoryLabels[email.category as keyof typeof categoryLabels]}
                </Badge>
              </div>
              <h4 className="mb-1 truncate text-sm">{email.subject || "(No subject)"}</h4>
              <p className="truncate text-xs text-muted-foreground">
                {new Date(email.received_at).toLocaleDateString()}
              </p>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default EmailList;