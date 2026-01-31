#!/usr/bin/env python3
"""
DIGITAKT 2 BATTCAVE - Wedge Stand Design
CadQuery implementation for comparison with OpenSCAD version

This demonstrates CadQuery's advantages:
- Workplanes that follow tilted surfaces
- Edge selectors for targeted filleting
- Shell operations for hollow interiors
- Cleaner code for complex geometry
"""

import cadquery as cq
from cadquery import exporters
import math

# ============================================
# DEVICE DIMENSIONS
# ============================================

device_width = 215
device_depth = 176
device_height = 63

# ============================================
# STAND DESIGN
# ============================================

tilt_angle = 12
wall = 5
base_floor = 8
shelf_width = 10        # How far shelf extends under device
shelf_thickness = 5
lip_height = 10
front_height = 55

# ============================================
# POWER BANK - Anker 165W
# ============================================

pb_length = 157
pb_width = 54
pb_height = 49

# ============================================
# W+ LINK TRANSMITTER
# ============================================

wl_size = 65
wl_height = 28

# ============================================
# AESTHETICS
# ============================================

corner_r = 8

# ============================================
# CALCULATED
# ============================================

clearance = 0.5

pocket_w = device_width + clearance * 2
pocket_d = device_depth + clearance * 2
stand_width = pocket_w + wall * 2
stand_depth = pocket_d + wall * 2

tilt_rad = math.radians(tilt_angle)
tilt_rise = stand_depth * math.tan(tilt_rad)
back_height = front_height + tilt_rise

shelf_z = front_height - lip_height - shelf_thickness
shelf_opening_w = pocket_w - shelf_width * 2
shelf_opening_d = pocket_d - shelf_width * 2

# ============================================
# HELPER FUNCTIONS
# ============================================

def z_at_y(base_z, y, tilt_deg):
    """Calculate Z height at a given Y position on tilted surface."""
    return base_z + y * math.tan(math.radians(tilt_deg))


# ============================================
# MAIN DESIGN
# ============================================

def create_battcave():
    """Create the Digitakt 2 BattCave stand."""

    # --- STEP 1: Create base wedge shape ---
    # Using loft between front and back profiles
    wedge = (
        cq.Workplane("XZ")
        .center(-stand_width/2, 0)
        # Front profile (rectangle)
        .lineTo(stand_width, 0)
        .lineTo(stand_width, front_height)
        .lineTo(0, front_height)
        .close()
        .extrude(stand_depth)
    )

    # Cut angled top to create wedge
    wedge = (
        wedge
        .faces(">Z")
        .workplane()
        .transformed(rotate=(tilt_angle, 0, 0), offset=(0, stand_depth/2, 0))
        .rect(stand_width * 2, stand_depth * 3)
        .cutBlind(-back_height * 2)
    )

    # --- STEP 2: Round vertical edges ---
    wedge = wedge.edges("|Z").fillet(corner_r)

    # --- STEP 3: Hollow out battery compartment ---
    # Interior void with tilted top that follows the shelf
    void_front_h = shelf_z - base_floor
    void_back_h = void_front_h + (stand_depth - wall * 2) * math.tan(tilt_rad)

    interior_void = (
        cq.Workplane("XZ")
        .center(-stand_width/2 + wall, base_floor)
        # Front profile
        .lineTo(stand_width - wall * 2, 0)
        .lineTo(stand_width - wall * 2, void_front_h)
        .lineTo(0, void_front_h)
        .close()
        .extrude(stand_depth - wall * 2)
    )

    # Cut angled top of interior to match shelf slope
    interior_void = (
        interior_void
        .faces(">Z")
        .workplane()
        .transformed(rotate=(tilt_angle, 0, 0), offset=(0, (stand_depth - wall * 2)/2, 0))
        .rect(stand_width * 2, stand_depth * 3)
        .cutBlind(-back_height * 2)
    )

    wedge = wedge.cut(interior_void)

    # --- STEP 4: Cut device pocket on tilted surface ---
    # THE KEY ADVANTAGE: workplane on the tilted top face
    wedge = (
        wedge
        .faces(">Z")                    # Select the sloped top face
        .workplane()                    # Workplane IS NOW TILTED
        .rect(pocket_w, pocket_d)       # Sketch on tilted plane
        .cutBlind(-front_height / 2)    # Cut perpendicular to tilted plane
    )

    # --- STEP 5: Cut shelf opening ---
    # Device edges will rest on the remaining shelf material
    wedge = (
        wedge
        .faces(">Z")
        .workplane()
        .rect(shelf_opening_w, shelf_opening_d)
        .cutBlind(-shelf_thickness * 2)
    )

    # --- STEP 6: Remove back lip (open for cables) ---
    # Cut the lip off the back portion
    back_cut_y = stand_depth - wall - shelf_width
    back_cut_z = shelf_z + shelf_thickness + (back_cut_y - wall) * math.tan(tilt_rad)

    back_cut = (
        cq.Workplane("XY")
        .center(0, back_cut_y + stand_depth / 2)
        .transformed(rotate=(tilt_angle, 0, 0))
        .rect(pocket_w, stand_depth)
        .extrude(lip_height * 2)
    )
    back_cut = back_cut.translate((0, 0, back_cut_z))

    wedge = wedge.cut(back_cut)

    # --- STEP 7: Add corner wrap at back-right ---
    wrap_size = 10
    wrap = (
        cq.Workplane("XY")
        .center(stand_width/2 - wall - wrap_size/2, back_cut_y + (stand_depth - back_cut_y) / 2)
        .transformed(rotate=(tilt_angle, 0, 0))
        .rect(wrap_size + wall, stand_depth - back_cut_y)
        .extrude(lip_height)
    )
    wrap = wrap.translate((0, 0, back_cut_z))

    # Cut L-notch from wrap for device clearance
    notch = (
        cq.Workplane("XY")
        .center(stand_width/2 - wall - wrap_size/2 - 2, back_cut_y + 5)
        .transformed(rotate=(tilt_angle, 0, 0))
        .rect(wrap_size + clearance, device_depth + wall + clearance - (stand_depth - back_cut_y - wall))
        .extrude(lip_height * 2)
    )
    notch = notch.translate((0, 0, back_cut_z - 1))

    wrap = wrap.cut(notch)
    wedge = wedge.union(wrap)

    # --- STEP 8: Add cable hole in back wall ---
    cable_hole_w = 50
    cable_hole_h = 25
    cable_hole_r = 8

    cable_hole = (
        cq.Workplane("XY")
        .center(0, stand_depth)
        .rect(cable_hole_w, wall * 2)
        .extrude(cable_hole_h)
        .edges("|Y").fillet(cable_hole_r)
    )
    cable_hole = cable_hole.translate((0, 0, base_floor + 15))

    wedge = wedge.cut(cable_hole)

    return wedge


def create_ghost_device():
    """Create ghost preview of Digitakt 2 sitting on shelf."""
    ghost = (
        cq.Workplane("XY")
        .rect(device_width, device_depth)
        .extrude(device_height)
    )
    # Position on shelf
    ghost = ghost.translate((
        0,
        0,
        shelf_z + shelf_thickness + 0.5
    ))
    # Tilt to match shelf angle
    ghost = ghost.rotate((0, 0, 0), (1, 0, 0), tilt_angle)

    return ghost


def create_ghost_powerbank():
    """Create ghost preview of power bank in battery compartment."""
    return (
        cq.Workplane("XY")
        .rect(pb_length, pb_width)
        .extrude(pb_height)
        .translate((
            -stand_width/2 + wall + 10 + pb_length/2,
            stand_depth/2 - wall - pb_width/2 - 10,
            base_floor + 1
        ))
    )


def create_ghost_wlink():
    """Create ghost preview of W+ Link transmitter."""
    return (
        cq.Workplane("XY")
        .rect(wl_size, wl_size)
        .extrude(wl_height)
        .translate((
            stand_width/2 - wall - wl_size/2 - 10,
            -stand_depth/2 + wall + wl_size/2 + 15,
            base_floor + 1
        ))
    )


# ============================================
# BUILD AND EXPORT
# ============================================

if __name__ == "__main__":
    print("=== Digitakt 2 BattCave (CadQuery) ===")
    print(f"Stand: {stand_width:.1f} x {stand_depth:.1f} mm")
    print(f"Pocket: {pocket_w:.1f} x {pocket_d:.1f} mm")
    print(f"Shelf opening: {shelf_opening_w:.1f} x {shelf_opening_d:.1f} mm")
    print(f"Tilt: {tilt_angle}°")
    print(f"Front height: {front_height}mm, Back height: {back_height:.1f}mm")

    # Build main model
    battcave = create_battcave()

    # Calculate stats
    bb = battcave.val().BoundingBox()
    volume = battcave.val().Volume() / 1000  # mm³ to cm³

    print(f"\nBounding box: {bb.xlen:.1f} x {bb.ylen:.1f} x {bb.zlen:.1f} mm")
    print(f"Volume: {volume:.1f} cm³")
    print(f"Estimated mass (PLA): {volume * 1.24:.0f} g")

    # Check bed fit
    if bb.xlen <= 256 and bb.ylen <= 256 and bb.zlen <= 256:
        print("Fits on Bambu P1S: YES")
    else:
        print("Fits on Bambu P1S: NO - consider splitting")

    # Build ghost objects for visualization
    ghost_device = create_ghost_device()
    ghost_pb = create_ghost_powerbank()
    ghost_wlink = create_ghost_wlink()

    # Display in CQ-Editor or OCP CAD Viewer
    try:
        show_object(battcave, name="BattCave",
                   options={"color": "DarkSlateGray"})
        show_object(ghost_device, name="Ghost Digitakt",
                   options={"color": "DodgerBlue", "alpha": 0.3})
        show_object(ghost_pb, name="Ghost PowerBank",
                   options={"color": "DimGray", "alpha": 0.3})
        show_object(ghost_wlink, name="Ghost W+Link",
                   options={"color": "SteelBlue", "alpha": 0.3})
    except NameError:
        # Running outside CQ-Editor
        pass

    # Export STL
    exporters.export(battcave, "digitakt2-battcave.stl")
    print("\nExported: digitakt2-battcave.stl")
