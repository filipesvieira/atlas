package game

import "sort"

type ItemTemplateRegistry struct {
	byKey  map[string]LootTemplate
	byName map[string]string
}

func newItemTemplateRegistry(templates []LootTemplate) *ItemTemplateRegistry {
	registry := &ItemTemplateRegistry{
		byKey:  make(map[string]LootTemplate, len(templates)),
		byName: make(map[string]string, len(templates)),
	}
	for _, template := range templates {
		key := template.Key
		if key == "" {
			key = normalizeContentKey(template.Name)
		}
		template.Key = key
		if _, exists := registry.byKey[key]; exists {
			// Log de colisão de chaves
			println("⚠️ AVISO: Chave duplicada no ItemRegistry:", key)
		}
		registry.byKey[key] = template
		registry.byName[normalizeContentKey(template.Name)] = key
	}
	return registry
}

func (r *ItemTemplateRegistry) Get(keyOrName string) (LootTemplate, bool) {
	lookup := normalizeContentKey(keyOrName)
	if template, exists := r.byKey[lookup]; exists {
		return template, true
	}
	if canonicalKey, exists := r.byName[lookup]; exists {
		template, found := r.byKey[canonicalKey]
		return template, found
	}
	return LootTemplate{}, false
}

func (r *ItemTemplateRegistry) List() []LootTemplate {
	templates := make([]LootTemplate, 0, len(r.byKey))
	for _, template := range r.byKey {
		templates = append(templates, template)
	}
	sort.Slice(templates, func(i, j int) bool { return templates[i].Name < templates[j].Name })
	return templates
}

// ItemRegistry indexa o catálogo declarativo por chave estável e nome de exibição.
var ItemRegistry = newItemTemplateRegistry(lootTemplates)
