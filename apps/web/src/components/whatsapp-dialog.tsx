import { CheckCircle2, Loader2, Unplug } from "lucide-react";

import type { ErrorResponse } from "@workspace/shared";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { useWhatsappStatus } from "@/lib/whatsapp-hook";

function getWhatsappErrorMessage(error: ErrorResponse): string {
    return error.code === "FORBIDDEN" ? "Hanya super admin yang dapat melihat status WhatsApp." : error.message;
}

/* toolbar button */

/** Opens the dialog. The dot shows the connection at a glance: green = connected, amber = needs attention. */
export function WhatsappStatusButton({ onClick }: { onClick: () => void }) {
    const status = useWhatsappStatus({ pollMs: 30_000 });
    const data = status.data;

    const dot = !data
        ? null
        : !data.enabled
          ? "bg-muted-foreground"
          : data.connected
            ? "bg-emerald-500"
            : "bg-amber-500";
    const label = !data ? "" : !data.enabled ? "Disabled" : data.connected ? "Connected" : "Not connected";

    return (
        <Button variant="outline" onClick={onClick} size="sm">
            <Unplug className="size-4 shrink-0" />
            Connect
            {dot && (
                <>
                    <span aria-hidden className={`size-2 rounded-full ${dot}`} />
                    <span className="sr-only">{label}</span>
                </>
            )}
        </Button>
    );
}

/* dialog */

type WhatsappDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export function WhatsappDialog({ open, onOpenChange }: WhatsappDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[calc(100%-1rem)] max-w-none md:max-w-md">
                <DialogHeader>
                    <DialogTitle>WhatsApp Connection</DialogTitle>
                    <DialogDescription>
                        Akun WhatsApp yang dipakai untuk mengirim alert ke penerima notifikasi.
                    </DialogDescription>
                </DialogHeader>

                {/* Mounted only while open, so polling runs only while someone is looking at the QR. */}
                {open && <WhatsappContent />}
            </DialogContent>
        </Dialog>
    );
}

function WhatsappContent() {
    const status = useWhatsappStatus({ pollMs: 3_000 });

    if (status.isPending) {
        return <Skeleton className="mx-auto size-64" />;
    }

    if (status.isError) {
        return (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
                <p className="text-sm text-muted-foreground">{getWhatsappErrorMessage(status.error)}</p>
                <Button variant="outline" size="sm" onClick={() => void status.refetch()}>
                    Retry
                </Button>
            </div>
        );
    }

    const { enabled, connected, qrImage } = status.data;

    if (!enabled) {
        return (
            <Alert variant="info">
                <AlertDescription>
                    WhatsApp dinonaktifkan di server (<code>WHATSAPP_ENABLED=false</code>). Aktifkan lalu restart API
                    untuk menautkan akun.
                </AlertDescription>
            </Alert>
        );
    }

    if (connected) {
        return (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
                <CheckCircle2 className="size-12 text-emerald-500" />
                <p className="font-medium">Terhubung</p>
                <p className="text-sm text-muted-foreground">Akun WhatsApp siap mengirim alert.</p>
            </div>
        );
    }

    if (qrImage) {
        return (
            <div className="flex flex-col items-center gap-4">
                {/* White background on purpose: a QR code on a dark theme cannot be scanned. */}
                <img src={qrImage} alt="WhatsApp pairing QR code" className="size-64 rounded-md bg-white p-2" />

                <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                    <li>Buka WhatsApp di ponsel.</li>
                    <li>
                        Buka <span className="font-medium text-foreground">Perangkat tertaut</span>, lalu{" "}
                        <span className="font-medium text-foreground">Tautkan perangkat</span>.
                    </li>
                    <li>Arahkan kamera ke QR code ini.</li>
                </ol>

                <p className="text-xs text-muted-foreground">QR code diperbarui otomatis.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
            <p className="text-sm font-medium">Menunggu QR code...</p>
            <p className="text-xs text-muted-foreground">
                Jika terlalu lama, periksa log server. Setelah logout dari ponsel, folder auth WhatsApp harus dihapus
                sebelum QR baru muncul.
            </p>
        </div>
    );
}
