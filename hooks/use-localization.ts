import { useLocalizationContext } from "../providers/LocalizationProvider";

export const useLocalization = () => {
  return useLocalizationContext();
};
