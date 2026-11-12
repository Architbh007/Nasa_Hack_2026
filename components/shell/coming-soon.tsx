import { Construction } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function ComingSoon({ phase }: { phase: number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-10 text-sm text-muted-foreground">
        <Construction className="size-5 text-warning" aria-hidden />
        This view lands in build phase {phase}.
      </CardContent>
    </Card>
  );
}
