import { Field, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";

export type DetailEntry = [label: string, value: string];
export type DetailSection = { title: string; entries: DetailEntry[] };

type DetailSectionsProps = {
    sections: DetailSection[];
    /** Prefix of the generated input ids, e.g. "view-user", so two dialogs never share an id. */
    idPrefix: string;
};

/** Read-only label/value grid, grouped in titled sections. The body of a "View" dialog. */
export function DetailSections({ sections, idPrefix }: DetailSectionsProps) {
    return (
        <>
            {sections.map((section) => (
                <section key={section.title} className="flex flex-col gap-3">
                    <h3 className="text-sm font-medium">{section.title}</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                        {section.entries.map(([label, value]) => {
                            const id = `${idPrefix}-${label.toLowerCase().replace(/\W+/g, "-")}`;

                            return (
                                <Field key={label}>
                                    <FieldLabel htmlFor={id}>{label}</FieldLabel>
                                    <Input id={id} value={value} disabled />
                                </Field>
                            );
                        })}
                    </div>
                </section>
            ))}
        </>
    );
}
