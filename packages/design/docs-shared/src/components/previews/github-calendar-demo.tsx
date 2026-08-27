import { GitHubCalendar } from "@nebutra/ui/primitives";

export function GithubCalendarDemo() {
  // Generate a year of random contribution data ending today
  const generateData = () => {
    const data = [];
    const now = new Date();
    for (let i = 365; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);

      // Randomize activity pattern to look somewhat realistic
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const baseProbability = isWeekend ? 0.3 : 0.7;

      let count = 0;
      if (Math.random() < baseProbability) {
        count = Math.floor(Math.random() * 5) + 1;
      }

      // `split` is typed as possibly-undefined at index 0 under noUncheckedIndexedAccess;
      // an ISO string always has a date part, so slice says so without a cast.
      data.push({
        date: date.toISOString().slice(0, 10),
        count,
      });
    }
    return data;
  };

  const data = generateData();

  return (
    <div className="max-w-4xl p-4 md:p-8 mx-auto flex w-full items-center justify-center">
      <GitHubCalendar data={data} />
    </div>
  );
}
