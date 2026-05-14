"use client";

import { useState } from "react";
import { Button, Card, CardContent } from "@grwfit/ui";
import { StickyNote, Send } from "lucide-react";
import { useMemberNotes, useAddNote } from "@/hooks/use-members";
import { usePermission } from "@/hooks/use-permission";
import { format } from "date-fns";
import { Skeleton } from "@grwfit/ui";

export function NotesTab({ memberId }: { memberId: string }) {
  const canCreate = usePermission("members", "create");
  const [text, setText] = useState("");

  const { data: notes, isLoading } = useMemberNotes(memberId);
  const addNote = useAddNote(memberId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    await addNote.mutateAsync(text.trim());
    setText("");
  };

  return (
    <div className="space-y-4">
      {/* Add note form */}
      {canCreate && (
        <form onSubmit={(e) => void handleSubmit(e)} className="flex gap-2">
          <textarea
            className="flex-1 rounded-md border bg-background px-3 py-2 text-sm min-h-[80px] resize-none"
            placeholder="Add a note about this member..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void handleSubmit(e);
            }}
          />
          <Button type="submit" size="icon" className="self-end" loading={addNote.isPending} disabled={!text.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      )}

      {/* Notes list */}
      <div className="space-y-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}><CardContent className="pt-4"><Skeleton className="h-12 w-full" /></CardContent></Card>
            ))
          : (notes?.length ?? 0) === 0
          ? (
              <div className="text-center py-12">
                <StickyNote className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No notes yet</p>
              </div>
            )
          : notes?.map((note) => (
              <Card key={note.id}>
                <CardContent className="pt-4">
                  <p className="text-sm whitespace-pre-wrap">{note.note}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {format(new Date(note.createdAt), "dd MMM yyyy, h:mm a")}
                  </p>
                </CardContent>
              </Card>
            ))}
      </div>
    </div>
  );
}
