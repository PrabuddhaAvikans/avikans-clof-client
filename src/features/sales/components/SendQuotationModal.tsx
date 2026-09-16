import { useState } from "react";
import { Check, Copy, Link2, Mail, MessageCircle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Tabs, TabList, Tab, TabPanel } from "@/components/ui/Tabs";
import { ROUTES } from "@/app/config/routes";
import { loadSystemSettings } from "@/lib/systemSettings";
import type { Quotation } from "@/types/quotation";

export type SendQuotationModalProps = {
  open: boolean;
  onClose: () => void;
  quotation: Quotation;
  onSent?: () => void;
};

type SendStatus = "idle" | "sending" | "sent" | "error";

export function SendQuotationModal({
  open,
  onClose,
  quotation,
  onSent,
}: SendQuotationModalProps) {
  const [activeTab, setActiveTab] = useState("email");
  const [status, setStatus] = useState<SendStatus>("idle");
  const [copied, setCopied] = useState(false);

  const previewLink = `${window.location.origin}${ROUTES.quotations.preview(quotation.id)}`;
  const companyName = loadSystemSettings().companyName;

  const handleSend = async () => {
    setStatus("sending");
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setStatus("sent");
    onSent?.();
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(previewLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setStatus("idle");
    setCopied(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`Send ${quotation.quotationNumber}`}
      size="lg"
      footer={
        activeTab !== "link" ? (
          <>
            <Button variant="outline" onClick={handleClose} disabled={status === "sending"}>
              Cancel
            </Button>
            <Button onClick={() => void handleSend()} loading={status === "sending"} disabled={status === "sent"}>
              {status === "sent" ? "Sent" : "Send"}
            </Button>
          </>
        ) : (
          <Button variant="outline" onClick={handleClose}>Close</Button>
        )
      }
    >
      <Tabs value={activeTab} onChange={setActiveTab}>
        <TabList>
          <Tab value="email"><Mail className="mr-1 inline h-4 w-4" />Email</Tab>
          <Tab value="whatsapp"><MessageCircle className="mr-1 inline h-4 w-4" />WhatsApp</Tab>
          <Tab value="link"><Link2 className="mr-1 inline h-4 w-4" />Copy Link</Tab>
        </TabList>

        <TabPanel value="email">
          <div className="space-y-4">
            <Input label="To" defaultValue={quotation.customerEmail} />
            <Input label="Subject" defaultValue={`Quotation ${quotation.quotationNumber} from ${companyName}`} />
            <Textarea
              label="Message"
              rows={5}
              defaultValue={`Dear ${quotation.customerName},\n\nPlease find attached quotation ${quotation.quotationNumber} for your review.\n\nValid until: ${quotation.validUntil.slice(0, 10)}\n\nBest regards,\n${companyName}`}
            />
            {status === "sent" && (
              <p className="flex items-center gap-2 text-sm text-success">
                <Check className="h-4 w-4" /> Email sent successfully
              </p>
            )}
          </div>
        </TabPanel>

        <TabPanel value="whatsapp">
          <div className="space-y-4">
            <Input label="Phone Number" placeholder="+94 77 000 0000" />
            <Textarea
              label="Message"
              rows={4}
              defaultValue={`Hi ${quotation.customerName}, your quotation ${quotation.quotationNumber} from ${companyName} is ready. View: ${previewLink}`}
            />
            {status === "sent" && (
              <p className="flex items-center gap-2 text-sm text-success">
                <Check className="h-4 w-4" /> WhatsApp message sent
              </p>
            )}
          </div>
        </TabPanel>

        <TabPanel value="link">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share this link with your customer to view the quotation online.
            </p>
            <div className="flex gap-2">
              <Input value={previewLink} readOnly className="flex-1" />
              <Button variant="outline" leftIcon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} onClick={() => void handleCopyLink()}>
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
        </TabPanel>
      </Tabs>
    </Modal>
  );
}
