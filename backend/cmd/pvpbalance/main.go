package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"

	"github.com/atlas/backend/pkg/game"
)

func main() {
	scenario := flag.String("scenario", game.PvPBalanceScenarioMechanicsEqualCP, "cenário: mechanics_equal_cp, starter_baseline ou starter_archetype")
	seeds := flag.Int("seeds", game.PvPBalanceDefaultSeeds, "quantidade de seeds por confronto")
	jsonOutput := flag.Bool("json", false, "imprime relatório JSON")
	flag.Parse()

	report, err := game.RunPvPBalanceMatrix(*scenario, *seeds)
	if err != nil {
		fmt.Fprintln(os.Stderr, "erro:", err)
		os.Exit(1)
	}
	if *jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		if err := enc.Encode(report); err != nil {
			fmt.Fprintln(os.Stderr, "erro ao serializar relatório:", err)
			os.Exit(1)
		}
		return
	}
	fmt.Printf("PvP balance scenario=%s seeds=%d\n", report.Scenario, report.Seeds)
	failed := false
	for _, result := range report.Results {
		status := "DIAGNOSTIC"
		if result.Eligible {
			status = "PASS"
			if !result.WithinBalanceGate {
				status = "FAIL"
				failed = true
			}
		}
		fmt.Printf("%-12s x %-12s CP=%d/%d gap=%.2f%% W=%d/%d D=%d T=%d dominant=%.0f%% %s\n",
			result.ProfileA, result.ProfileB, result.CombatPowerA, result.CombatPowerB,
			result.PowerGapPercent, result.WinsA, result.WinsB, result.Draws, result.Timeouts,
			result.DominantWinShare*100, status)
	}
	if failed {
		os.Exit(2)
	}
}
