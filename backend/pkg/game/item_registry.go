package game

import "sort"

type ItemTemplateRegistry struct {
	byName map[string]LootTemplate
}

func newItemTemplateRegistry(templates []LootTemplate) *ItemTemplateRegistry {
	registry := &ItemTemplateRegistry{byName: make(map[string]LootTemplate, len(templates))}
	for _, template := range templates {
		registry.byName[normalizeContentKey(template.Name)] = template
	}
	return registry
}

func (r *ItemTemplateRegistry) Get(name string) (LootTemplate, bool) {
	template, exists := r.byName[normalizeContentKey(name)]
	return template, exists
}

func (r *ItemTemplateRegistry) List() []LootTemplate {
	templates := make([]LootTemplate, 0, len(r.byName))
	for _, template := range r.byName {
		templates = append(templates, template)
	}
	sort.Slice(templates, func(i, j int) bool { return templates[i].Name < templates[j].Name })
	return templates
}

// ItemRegistry indexa o catálogo declarativo; adicionar equipamento não exige
// editar regras do engine nem criar novos ifs de lookup.
var ItemRegistry = newItemTemplateRegistry(lootTemplates)
