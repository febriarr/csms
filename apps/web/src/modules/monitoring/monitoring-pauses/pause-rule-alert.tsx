import { Info } from "lucide-react";

import { Alert, AlertDescription } from "@workspace/ui/components/alert";

export function PauseRuleAlert() {
    return (
        <Alert variant="info">
            <Info />

            <AlertDescription>
                While a pause is active, temperature alerts and state changes are held (readings are still stored).{" "}
                <strong className="font-medium">OFFLINE detection is not affected</strong>: a device that goes silent
                during a pause is still treated as a real fault.
            </AlertDescription>
        </Alert>
    );
}
