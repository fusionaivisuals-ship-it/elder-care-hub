import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/components/LanguageProvider";
import { Page } from "@/components/Shell";
import { ProviderExplorer, useExplorerLocation } from "@/components/explorer/ProviderExplorer";
import { usePlan } from "@/context/PlanContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const MapPage = () => {
  const { t } = useLang();
  const { answers } = usePlan();
  const [loc, setLoc] = useExplorerLocation(answers);
  useDocumentTitle(t("mapTitle"));

  return (
    <Page>
      <Button asChild variant="ghost" size="sm" className="no-print -ml-2 mb-2 min-h-12">
        <Link to={answers ? "/plan?part=3" : "/"}>
          <ArrowLeft className="mr-1 h-4 w-4" aria-hidden />
          {answers ? t("planTitle") : t("home")}
        </Link>
      </Button>
      <h1 className="mb-4 text-2xl sm:text-3xl">{t("mapTitle")}</h1>
      <ProviderExplorer city={loc.city} district={loc.district} onLocation={setLoc} />
    </Page>
  );
};

export default MapPage;
