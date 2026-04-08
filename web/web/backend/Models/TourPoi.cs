using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("tour_pois")]
public class TourPoi
{
    // 🔥 THÊM 3 DÒNG NÀY VÀO ĐỂ KHỚP VỚI DATABASE
    [Key]
    [Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)] // Báo cho EF Core biết cột này DB tự tăng
    public int id { get; set; }

    [Column("tour_id")]
    public int tour_id { get; set; }

    [Column("poi_id")]
    public int poi_id { get; set; }

    [ForeignKey("tour_id")]
    public Tour Tour { get; set; }

    [ForeignKey("poi_id")]
    public NarrationPoint Poi { get; set; }
}