@fragment
fn fs_main() -> @location(0) vec4 < f32> {
    return vec4 < f32 > (${this.color.join(', ')});
}
