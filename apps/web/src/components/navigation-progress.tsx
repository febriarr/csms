import { useEffect, useState } from "react";
import { useNavigation } from "react-router";

export function NavigationProgress() {
    const navigation = useNavigation();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (navigation.state === "idle") {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setVisible(false);
            return;
        }

        const timeout = window.setTimeout(() => {
            setVisible(true);
        }, 200);

        return () => window.clearTimeout(timeout);
    }, [navigation.state]);

    if (!visible) return null;

    return (
        <div
            role="status"
            aria-label="Loading page"
            className="fixed inset-x-0 top-0 z-100 h-0.5 overflow-hidden bg-primary/15"
        >
            <div className="navigation-progress-bar h-full w-1/3 bg-primary" />
            <span className="sr-only">Loading page...</span>
        </div>
    );
}
