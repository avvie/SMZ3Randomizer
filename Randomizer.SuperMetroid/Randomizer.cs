﻿using System;
using System.Collections.Generic;
using System.Linq;
using Randomizer.Contracts;
using static Randomizer.Contracts.RandomizerOptionType;

namespace Randomizer.SuperMetroid {

    public class Randomizer : IRandomizer {
        
        public static readonly Version version = new Version(3, 0);

        public string Id => "sm";

        public string Name => "Super Metroid Item Randomizer";

        public string Version => version.ToString();

        public List<IRandomizerOption> Options => new List<IRandomizerOption> {
            Config.GetRandomizerOption<Logic>("Logic"),
            Config.GetRandomizerOption<Goal>("Goal"),
            Config.GetRandomizerOption<Placement>("Item Placement"),
            new RandomizerOption {
                Key = "seed", Description = "Seed", Type = Input
            },
            Config.GetRandomizerOption<GameMode>("Game mode"),
            new RandomizerOption {
                Key = "players", Description = "Players", Type = Players, Default = "2"
            },
        };
        public ISeedData GenerateSeed(IDictionary<string, string> options, string seed) {
            if (seed == "") {
                seed = System.Security.Cryptography.RandomNumberGenerator.GetInt32(0, int.MaxValue).ToString();
            }
            else {
                seed = seed.ToCharArray().Sum(x => x).ToString();
            }

            var rnd = new Random(int.Parse(seed));
            var config = new Config(options);

            int players = options.ContainsKey("players") ? int.Parse(options["players"]) : 1;
            var worlds = new List<World>();

            if (config.GameMode == GameMode.Normal || players == 1) {
                worlds.Add(new World(config, "Player", 0));
            }
            else {
                for (int p = 0; p < players; p++) {
                    worlds.Add(new World(config, options[$"player-{p}"], p));
                }
            }

            var guid = Guid.NewGuid().ToString();

            var filler = new Filler(worlds, config, rnd);
            filler.Fill();

            var playthrough = new Playthrough(worlds);
            var spheres = playthrough.Generate();

            var seedData = new SeedData {
                Guid = guid.Replace("-", ""),
                Seed = seed,
                Game = Name,
                Logic = config.Logic.ToLString(),
                Playthrough = spheres,
                Mode = config.GameMode.ToLString(),
                Worlds = new List<IWorldData>()
            };

            foreach(var world in worlds) {
                var patch = new Patch(world, worlds, seedData.Guid);
                var worldData = new WorldData {
                    Id = world.Id,
                    Guid = world.Guid.Replace("-",""),
                    Player = world.Player,
                    Patches = patch.Create()
                };

                seedData.Worlds.Add(worldData);
            }

            return seedData;
        }

    }

    public class RandomizerOption : IRandomizerOption {
        public string Key { get; set; }
        public string Description { get; set; }
        public RandomizerOptionType Type { get; set; }
        public Dictionary<string, string> Values { get; set; }
        public string Default { get; set; }
    }

    public class SeedData : ISeedData {
        public string Guid { get; set; }
        public string Seed { get; set; }
        public string Game { get; set; }
        public string Logic { get; set; }
        public string Mode { get; set; }
        public List<IWorldData> Worlds { get; set; }
        public List<Dictionary<string, string>> Playthrough { get; set; }
    }

    public class WorldData : IWorldData {
        public int Id { get; set; }
        public string Guid { get; set; }
        public string Player { get; set; }
        public Dictionary<int, byte[]> Patches { get; set; }
    }
}
