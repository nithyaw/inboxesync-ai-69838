import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Email } from "./EmailInbox";
import { Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EmailDetailProps {
  email: Email | null;
}

const categoryColors = {
  interested: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  meeting_booked: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  not_interested: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  spam: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
  out_of_office: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
  uncategorized: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20",
};

const EmailDetail = ({ email }: EmailDetailProps) => {
  const [suggestedReply, setSuggestedReply] = useState<string>("");
  const [loadingReply, setLoadingReply] = useState(false);

  if (!email) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background">
        <p className="text-muted-foreground">Select an email to view</p>
      </div>
    );
  }

  const getSuggestedReply = async () => {
    setLoadingReply(true);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-reply', {
        body: { emailId: email.id }
      });

      if (error) throw error;
      setSuggestedReply(data.reply);
    } catch (error) {
      console.error('Error getting reply:', error);
      toast.error("Failed to generate reply");
    } finally {
      setLoadingReply(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col bg-background">
      <div className="border-b p-6">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex-1">
            <h2 className="mb-2 text-2xl font-bold">{email.subject || "(No subject)"}</h2>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>From: {email.from_address}</span>
              <span>•</span>
              <span>{new Date(email.received_at).toLocaleString()}</span>
            </div>
          </div>
          <Badge
            variant="outline"
            className={categoryColors[email.category as keyof typeof categoryColors]}
          >
            {email.category.replace('_', ' ')}
          </Badge>
        </div>
        
        <Button onClick={getSuggestedReply} disabled={loadingReply} variant="outline" size="sm">
          {loadingReply ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Suggest Reply
            </>
          )}
        </Button>
      </div>

      <ScrollArea className="flex-1 p-6">
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <p className="whitespace-pre-wrap">{email.body}</p>
        </div>

        {suggestedReply && (
          <>
            <Separator className="my-6" />
            <div className="rounded-lg border bg-accent/50 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="h-4 w-4 text-primary" />
                AI Suggested Reply
              </div>
              <p className="whitespace-pre-wrap text-sm">{suggestedReply}</p>
            </div>
          </>
        )}
      </ScrollArea>
    </div>
  );
};

export default EmailDetail;