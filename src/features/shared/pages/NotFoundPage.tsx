import { FileQuestion } from "lucide-react";
import { Link } from "react-router-dom";
import { ROUTES } from "@/app/config/routes";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export function NotFoundPage() {
  return (
    <PageContainer>
      <EmptyState
        icon={<FileQuestion className="h-6 w-6" />}
        title="Page not found"
        description="The page you are looking for does not exist or may have been moved."
        action={
          <Link to={ROUTES.dashboard}>
            <Button variant="outline">Go to Dashboard</Button>
          </Link>
        }
      />
    </PageContainer>
  );
}
