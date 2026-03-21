# RFdiffusion Workspace

## Setup

RFdiffusion was installed on a RunPod Linux instance with an NVIDIA L40S (46GB VRAM).
PyTorch 2.4.1+cu124 was pre-installed. Additional deps installed via pip:

```bash
pip install hydra-core pyrsistent icecream opt_einsum e3nn
pip install dgl -f https://data.dgl.ai/wheels/torch-2.4/cu124/repo.html
cd /home/claude/RFdiffusion/env/SE3Transformer && pip install .
cd /home/claude/RFdiffusion && pip install -e .
pip install pymol-open-source
```

Model weights downloaded to `/home/claude/RFdiffusion/models/`:
```bash
cd /home/claude/RFdiffusion/models
wget http://files.ipd.uw.edu/pub/RFdiffusion/6f5902ac237024bdd0c176cb93063dc4/Base_ckpt.pt
wget http://files.ipd.uw.edu/pub/RFdiffusion/60f09a193fb5e5ccdc4980417708dbab/Complex_Fold_base_ckpt.pt
```

## Generated Designs

### 1. Unconditional Monomer (100 residues)

Simple unconditional backbone generation using the base model.

```bash
cd /home/claude/RFdiffusion

python3 scripts/run_inference.py \
  inference.output_prefix=/workspace/RFdiffusion/workspace/outputs/test \
  inference.model_directory_path=/home/claude/RFdiffusion/models \
  inference.num_designs=1 \
    
```

Output: `outputs/test_0.pdb`

### 2. Beta-Sheet Rich Protein (101 residues)

Fold-conditioned generation with 8 beta strands (10 residues each) and 3-residue loops.
Uses `Complex_Fold_base_ckpt.pt` with custom SS/adjacency tensors.

SS/adjacency tensors created with:
```python
import torch

ss = []
strands = []
pos = 0
for i in range(8):
    strands.append((pos, pos+10))
    ss.extend([1]*10)  # 1 = strand (E)
    pos += 10
    if i < 7:
        ss.extend([2]*3)  # 2 = loop (L)
        pos += 3

ss_tensor = torch.tensor(ss, dtype=torch.float32)

# Adjacent strands + barrel closure (strand 0 <-> strand 7)
block_adj = torch.zeros(len(ss), len(ss))
for i in range(len(strands)):
    j = (i + 1) % len(strands)
    s1s, s1e = strands[i]
    s2s, s2e = strands[j]
    block_adj[s1s:s1e, s2s:s2e] = 1
    block_adj[s2s:s2e, s1s:s1e] = 1

torch.save(ss_tensor, 'beta_rich_ss.pt')
torch.save(block_adj, 'beta_rich_adj.pt')
```

Inference command:
```bash
python3 scripts/run_inference.py \
  inference.output_prefix=/workspace/RFdiffusion/workspace/outputs/beta_sheet \
  inference.model_directory_path=/home/claude/RFdiffusion/models \
  inference.num_designs=1 \
  'contigmap.contigs=[101-101]' \
  scaffoldguided.scaffoldguided=True \
  scaffoldguided.target_pdb=False \
  scaffoldguided.scaffold_dir=/tmp/beta_scaffold
```

Output: `outputs/beta_sheet_0.pdb`

### 3. Spiky Protein (135 residues)

Extended structure with 6 long alpha helices (20 residues each), short loops,
empty adjacency (helices don't pack), and large ROG potential to maximize extension.

```bash
python3 scripts/run_inference.py \
  inference.output_prefix=/workspace/RFdiffusion/workspace/outputs/spiky \
  inference.model_directory_path=/home/claude/RFdiffusion/models \
  inference.num_designs=1 \
  'contigmap.contigs=[135-135]' \
  scaffoldguided.scaffoldguided=True \
  scaffoldguided.target_pdb=False \
  scaffoldguided.scaffold_dir=/tmp/spiky_scaffold \
  'potentials.guiding_potentials=["type:monomer_ROG,weight:1,min_dist:30"]' \
  potentials.guide_scale=5 \
  potentials.guide_decay="quadratic"
```

Output: `outputs/spiky_0.pdb`

### 4. Beta-Barrel Protein (124 residues)

Classic beta-barrel: 8 strands of 12 residues, 4-residue turns.
Adjacency: sequential neighbors + barrel closure + cross-barrel contacts (i <-> i+4).
Contact potential for compact packing.

```bash
python3 scripts/run_inference.py \
  inference.output_prefix=/workspace/RFdiffusion/workspace/outputs/barrel \
  inference.model_directory_path=/home/claude/RFdiffusion/models \
  inference.num_designs=1 \
  'contigmap.contigs=[124-124]' \
  scaffoldguided.scaffoldguided=True \
  scaffoldguided.target_pdb=False \
  scaffoldguided.scaffold_dir=/tmp/barrel_scaffold \
  'potentials.guiding_potentials=["type:monomer_contacts,weight:0.05"]' \
  potentials.guide_scale=2 \
  potentials.guide_decay="quadratic"
```

Output: `outputs/barrel_0.pdb`

### 5. Beta-Barrel with Central Alpha Helix (148 residues)

Iterative design of a beta-barrel with an alpha helix threading through the center.
5 iterations (v1-v5) exploring topology, adjacency, and potential parameters.

**Topology (v4/v5 — best):**
- 12 beta strands (8 residues each) with 2-residue turns forming the barrel
- 1 central alpha helix (24 residues) mid-sequence, connected by 4-residue loops
- SS: `EEEEEEEELLEEEEEEEELLEEEEEEEELLEEEEEEEELLEEEEEEEELLEEEEEEEELLLLHHHHHHHHHHHHHHHHHHHHHHHHLLLLEEEEEEEELLEEEEEEEELLEEEEEEEELLEEEEEEEELLEEEEEEEELLEEEEEEEE`

**Adjacency:**
- Sequential barrel neighbors + closure (strand 12 <-> strand 1)
- Cross-barrel contacts (i <-> i+6, i+4, i+8)
- Helix contacts ALL 12 strands (pulls it into center)

**Iteration history:**

| Version | Change | Result |
|---------|--------|--------|
| v1 | 8 strands, helix mid-sequence, helix contacts all strands | Helix alongside barrel, not through it |
| v2 | Helix at N-term, 10 strands, helix contacts alternating strands | Better barrel but helix still on outside |
| v3 | 12 strands (7 res), helix mid-sequence, long loops, 3 designs | Helix starting to nestle inside barrel |
| v4 | 12 strands (8 res), tighter 2-res turns, dense cross-barrel adj, 3 designs | v4_2: clear helix inside barrel from top view |
| v5 | Same topology as v4, stronger contacts (0.2) + ROG compaction, 5 designs | v5_2: best overall, helix enclosed by barrel |

**Best design command (v5):**
```bash
python3 scripts/run_inference.py \
  inference.output_prefix=/workspace/RFdiffusion/workspace/outputs/helix_barrel_iterations/v5 \
  inference.model_directory_path=/home/claude/RFdiffusion/models \
  inference.num_designs=5 \
  'contigmap.contigs=[148-148]' \
  scaffoldguided.scaffoldguided=True \
  scaffoldguided.target_pdb=False \
  scaffoldguided.scaffold_dir=/tmp/hb_scaffold_v4 \
  'potentials.guiding_potentials=["type:monomer_contacts,weight:0.2","type:monomer_ROG,weight:1,min_dist:5"]' \
  potentials.guide_scale=5 \
  potentials.guide_decay="quadratic"
```

**Outputs:**
- Best: `outputs/helix_barrel_final.pdb` (v5_2)
- Runner-up: `outputs/helix_barrel_runner_up.pdb` (v4_2)
- All iterations: `outputs/helix_barrel_iterations/v{1-5}_*.pdb`
- All renders: `renders/v{1-5}_*/` (front, side, top, angle1, angle2, back, surface)

## Visualization

Render all PDBs from multiple angles using PyMOL:

```bash
cd /workspace/RFdiffusion/workspace
python3 visualize.py                        # all PDBs in outputs/
python3 visualize.py outputs/barrel_0.pdb   # specific file
```

Renders are saved to `renders/<design_name>/` with views: front, side, top, angle1, angle2, back, surface.

## Secondary Structure Encoding

Used in fold conditioning (`_ss.pt` tensors):
- `0` = Helix (H)
- `1` = Strand (E)
- `2` = Loop (L)
- `3` = Mask (let model decide)

## Config

Main config: `/home/claude/RFdiffusion/config/inference/base.yaml`

Key parameters:
- `contigmap.contigs`: protein length / chain specification
- `scaffoldguided.scaffoldguided`: enable fold conditioning
- `scaffoldguided.scaffold_dir`: directory with `*_ss.pt` and `*_adj.pt` files
- `potentials.guiding_potentials`: auxiliary potentials (ROG, contacts, etc.)
- `potentials.guide_scale`: strength of potential guidance
- `inference.num_designs`: number of designs to generate
