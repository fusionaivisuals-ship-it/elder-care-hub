import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLang } from "@/components/LanguageProvider";
import { Page } from "@/components/Shell";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const NotFound = () => {
  const { t } = useLang();
  useDocumentTitle(t("notFound"));
  return (
    <Page className="flex flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl">{t("notFound")}</h1>
      <Button asChild className="min-h-12 px-6">
        <Link to="/">{t("home")}</Link>
      </Button>
    </Page>
  );
};

export default NotFound;
