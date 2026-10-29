import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { Info } from "lucide-react";

export function ThresholdRuleAlert() {
    return (
        <Alert variant="info">
            <Info />

            <AlertDescription>
                This threshold uses a <strong className="font-medium">greater than (&gt;)</strong> rule. For example,{" "}
                <strong className="font-medium">-18°C</strong> triggers the alert when the temperature exceeds{" "}
                <strong className="font-medium">-18°C</strong>.
            </AlertDescription>
        </Alert>
    );
}
