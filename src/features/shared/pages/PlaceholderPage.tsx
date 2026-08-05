import { Construction } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/feedback/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export type PlaceholderPageProps = {
  title: string;
  description?: string;
};

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <PageContainer>
      <PageHeader title={title} description={description} />
      <EmptyState
        icon={<Construction className="h-6 w-6" />}
        title="Coming soon"
        description="This page is under development and will be available in a future release."
      />
    </PageContainer>
  );
}
