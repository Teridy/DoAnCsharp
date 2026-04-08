using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("food_places")]
public class FoodPlace
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("narration_point_id")]
    public int NarrationPointId { get; set; }

    [Column("category_id")]
    public int CategoryId { get; set; }

    [Column("price_range")]
    public string? PriceRange { get; set; }

    [Column("opening_hours")]
    public string? OpeningHours { get; set; }

    [Column("description")]
    public string? Description { get; set; }

    // ✅ Đảm bảo NarrationPoint vẫn còn để EF mapping đúng
    [ForeignKey("NarrationPointId")]
    public virtual NarrationPoint? NarrationPoint { get; set; }
}