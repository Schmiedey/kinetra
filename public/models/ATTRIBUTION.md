# Anatomical mesh attribution

**BodyParts3D, © The Database Center for Life Science, licensed under CC Attribution-Share Alike 2.1 Japan.**

- Original dataset: https://lifesciencedb.jp/bp3d/
- License: https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en
- Dataset archive: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/
- Paper: Mitsuhashi et al., *BodyParts3D: 3D structure database for anatomical concepts*, Nucleic Acids Research 37, D782–D785 (2009). https://doi.org/10.1093/nar/gkn613

## GitHub source

The anatomical geometry was obtained from the BodyParts3D portions of **Johan Bellander's BodyExplorer** repository:
https://github.com/JohanBellander/BodyExplorer/tree/7d04bf3c4de2bd9cb234dd51d7e6857c099afafd

Files: `public/skeleton.glb`, `public/anatomy.glb`, and `public/mesh_mapping.json`.
The upstream repository also contains Z-Anatomy supplementary meshes. None of those supplementary meshes are included in this derived asset: each included muscle was checked against the upstream `source: bp3d` mapping.

## Changes made by LiftLab

- Retained 200 unique bone meshes (one duplicate hyoid mesh was removed).
- Selected 14 bilateral muscle meshes for clavicular / sternocostal / abdominal pectoralis major, anterior (clavicular) deltoid, and the three triceps heads.
- Merged bone meshes by articulated segment and muscles by modeled region and side.
- Transformed millimeter coordinates and fitted them to the generic simulation body proportions.
- Applied a fixed curled hand grip and dynamic rigid-bone / blended soft-tissue deformation.
- Recomputed normals and replaced materials with interactive visualization colors.

`liftlab-anatomy.glb`, its derived mesh data, and `manifest.json` are distributed under the **same CC BY-SA 2.1 Japan license**. Retain this attribution and license when sharing them or derivatives. Source names, FMA mappings, pinned repository commit and asset hashes are provided in `manifest.json`; the reproducible extraction script is `scripts/prepare_anatomy.py` in the LiftLab source.

Anatomical shape data does not validate the simulated joint motion, tissue deformation, demand allocation, or Estimated Stimulus Index. Those remain approximate models.
