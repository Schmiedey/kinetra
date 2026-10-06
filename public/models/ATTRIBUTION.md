# Anatomical mesh attribution

**BodyParts3D, © The Database Center for Life Science, licensed under CC Attribution-Share Alike 2.1 Japan.**

- Original dataset: https://lifesciencedb.jp/bp3d/
- License: https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en
- Dataset archive: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/
- Paper: Mitsuhashi et al., *BodyParts3D: 3D structure database for anatomical concepts*, Nucleic Acids Research 37, D782–D785 (2009). https://doi.org/10.1093/nar/gkn613

## GitHub source

The anatomical geometry was obtained from **Johan Bellander's BodyExplorer** repository:
https://github.com/JohanBellander/BodyExplorer/tree/7d04bf3c4de2bd9cb234dd51d7e6857c099afafd

Files: `public/skeleton.glb`, `public/anatomy.glb`, and `public/mesh_mapping.json`.
The four supplementary latissimus dorsi and rectus abdominis meshes use the upstream `source: z-anatomy` mapping. These components are from **Z-Anatomy, The Libre 3D Atlas**, CC BY-SA 4.0: https://github.com/Z-Anatomy/Models-of-human-anatomy/blob/master/License.txt . Z-Anatomy credits include Gauthier Kervyn, Marcin Zielinski and Lluis Vinent; the underlying BodyParts3D atlas credits Kousaku Okubo and DBCLS. Z-Anatomy component license: https://creativecommons.org/licenses/by-sa/4.0/ . All other selected muscles use the upstream `source: bp3d` mapping. No noncommercial supplementary ear or kidney meshes are included.

## Changes made by Kinetra

- Retained 200 unique bone meshes (one duplicate hyoid mesh was removed).
- Selected 280 unique muscle meshes covering the previous press/pull/leg set plus neck, face, forearms, hands, rotator cuff, adductors, and other body-completing tissue. Pelvic floor, viscera, eye extraocular muscles, and fascia sheets are omitted. The Bench lab still scores its 14 modeled press muscles.
- Merged bone meshes by articulated segment and muscles by modeled region and side.
- Transformed millimeter coordinates and fitted them to the generic simulation body proportions.
- Posed each finger phalanx with a rigid joint rotation, opposed the thumbs, and aligned a canonical grip center with the handle; applied dynamic rigid-bone / blended soft-tissue deformation.
- Recomputed normals and replaced materials with interactive visualization colors.

Mesh components retain their source licenses: **CC BY-SA 2.1 Japan** for BodyParts3D and **CC BY-SA 4.0** for supplementary Z-Anatomy components. Retain both attributions and applicable licenses when sharing the combined asset or derivatives. Source names, FMA mappings, per-component sources, pinned repository commit and asset hashes are provided in `manifest.json`; the reproducible extraction script is `scripts/prepare_anatomy.py` in the Kinetra source.

Anatomical shape data does not validate the simulated joint motion, tissue deformation, demand allocation, or Estimated Stimulus Index. Those remain approximate models.

The shipped Kinetra asset uses lossless `EXT_meshopt_compression` encoding. `scripts/compress-anatomy.mjs` verifies positions, normals, triangle winding, node transforms and attribution metadata before replacing the raw asset. Mesh counts and source provenance remain unchanged.
