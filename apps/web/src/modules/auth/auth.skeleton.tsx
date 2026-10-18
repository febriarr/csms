import { Card, CardContent, CardHeader } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";

export function LoginSkeleton() {
    return (
        <Card className="w-full max-w-sm" aria-busy="true" aria-label="Memuat halaman login">
            <CardHeader className="gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-9 w-full" />
                </div>
                <div className="flex flex-col gap-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-9 w-full" />
                </div>
                <Skeleton className="h-10 w-full" />
            </CardContent>
        </Card>
    );
}
