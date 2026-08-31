import { IdPhotoStudio } from "@/components/IdPhotoStudio";
import { QuietPage } from "@/components/QuietPage";

export default function IdPhotoPage() {
  return (
    <QuietPage active="/create" title="领证照" line="先留下一张可以用的。">
      <IdPhotoStudio />
    </QuietPage>
  );
}
