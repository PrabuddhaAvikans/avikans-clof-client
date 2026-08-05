import { ShieldOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/app/config/routes";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export function NoPermissionPage() {
  const navigate = useNavigate();

  return (
    <PageContainer>
      <EmptyState
        icon={<ShieldOff className="h-6 w-6" />}
        title="Access denied"
        description="You do not have permission to view this page. Contact your administrator if you believe this is an error."
        action={
          <Button variant="outline" onClick={() => navigate(ROUTES.dashboard)}>
            Go to Dashboard
          </Button>
        }
      />
    </PageContainer>
  );
}
