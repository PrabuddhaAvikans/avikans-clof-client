import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/feedback/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export type ListPageShellProps = {
  title: string;
  description?: string;
};

export function ListPageShell({ title, description }: ListPageShellProps) {
  return (
    <PageContainer>
      <PageHeader title={title} description={description} />
      <EmptyState
        title="Coming soon"
        description="This feature is under development and will be available in a future release."
      />
    </PageContainer>
  );
}
