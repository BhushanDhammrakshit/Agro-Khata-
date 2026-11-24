export type BadgeTone = "slate" | "blue" | "amber" | "purple" | "green" | "red";

const TONE_CLASSES: Record<BadgeTone, string> = {
  slate: "bg-[#E8E1CF] text-[#42506C] dark:bg-[#34364A] dark:text-[#C7C1B3]",
  blue: "bg-[#D9E4EA] text-[#315A78] dark:bg-[#314657] dark:text-[#BDD2DE]",
  amber: "bg-[#F0D5B4] text-[#80532B] dark:bg-[#5A4632] dark:text-[#F0C797]",
  purple: "bg-[#DDD7E7] text-[#17233F] dark:bg-[#49435A] dark:text-[#DDD7E7]",
  green: "bg-[#C8DDD1] text-[#2C6661] dark:bg-[#29453B] dark:text-[#B8D2C3]",
  red: "bg-[#F0C9C2] text-[#87382F] dark:bg-[#573638] dark:text-[#E7AAA0]",
};

export function Badge({ tone = "slate", children }: { tone?: BadgeTone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-none border border-current/10 px-2.5 py-1 text-xs font-bold whitespace-nowrap ${TONE_CLASSES[tone]}`}>
      {children}
    </span>
  );
}
