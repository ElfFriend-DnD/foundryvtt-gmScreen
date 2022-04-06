export async function preloadTemplates(): Promise<Handlebars.TemplateDelegate[]> {
  const templatePaths: string[] = [
    // Add paths to "modules/foundryvtt-gmScreen/templates"
  ];

  return loadTemplates(templatePaths);
}
