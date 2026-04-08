using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using static Stall;


public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<Audio> Audios { get; set; }
    public DbSet<History> Histories { get; set; }
    public DbSet<NarrationPoint> NarrationPoints { get; set; }
    public DbSet<NarrationTranslation> NarrationTranslations { get; set; }
    public DbSet<Tour> Tours { get; set; }
    public DbSet<UserWeb> UsersWeb { get; set; }
    public DbSet<Language> Languages { get; set; }
    public DbSet<TourPoi> TourPois { get; set; }
    public DbSet<Stall> Stalls { get; set; }
    public DbSet<Category> Categories { get; set; }
    public DbSet<UpdateRequest> UpdateRequests { get; set; }
    public DbSet<FoodPlace> FoodPlaces { get; set; }
    public DbSet<Image> Images { get; set; }    

    // ✅ FIX: Dùng static method thay vì switch expression (không dùng được trong expression tree)
    private static string StallStatusToString(StallStatus status)
    {
        if (status == StallStatus.Active)    return "Open";
        if (status == StallStatus.Closed)    return "Closed";
        if (status == StallStatus.Pending)   return "Pending";
        if (status == StallStatus.Unclaimed) return "Unclaimed";
        if (status == StallStatus.Rejected)  return "Rejected";
        return "Unclaimed";
    }

    private static StallStatus StringToStallStatus(string value)
    {
        if (value == "Open")      return StallStatus.Active;
        if (value == "Closed")    return StallStatus.Closed;
        if (value == "Pending")   return StallStatus.Pending;
        if (value == "Unclaimed") return StallStatus.Unclaimed;
        if (value == "Rejected")  return StallStatus.Rejected;
        return StallStatus.Unclaimed;
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // 1. Cấu hình TourPoi
        modelBuilder.Entity<TourPoi>().HasKey(tp => tp.id);
        modelBuilder.Entity<TourPoi>()
            .HasOne(tp => tp.Tour)
            .WithMany(t => t.TourPois)
            .HasForeignKey(tp => tp.tour_id);
        modelBuilder.Entity<TourPoi>()
            .HasOne(tp => tp.Poi)
            .WithMany()
            .HasForeignKey(tp => tp.poi_id);

        // 2. Cấu hình bảng Stalls
        var stallStatusConverter = new ValueConverter<StallStatus, string>(
            v => StallStatusToString(v),
            v => StringToStallStatus(v)
        );

        modelBuilder.Entity<Stall>(entity =>
        {
            entity.ToTable("stalls");

            entity.HasOne(s => s.NarrationPoint)
                  .WithMany()
                  .HasForeignKey(s => s.NarrationPointsId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.Property(s => s.OwnerId).IsRequired(false);

            entity.Property(s => s.Status)
                  .HasMaxLength(20)
                  .HasConversion(stallStatusConverter)
                  .HasDefaultValue(StallStatus.Unclaimed);
        });

        // 3. Cấu hình FoodPlace
        modelBuilder.Entity<FoodPlace>(entity =>
        {
            entity.ToTable("food_places");

            entity.HasOne(fp => fp.NarrationPoint)
                  .WithMany()
                  .HasForeignKey(fp => fp.NarrationPointId);
        });

        modelBuilder.Entity<UpdateRequest>().ToTable("update_requests");
        modelBuilder.Entity<Image>(entity =>
{
    entity.ToTable("images");
    entity.HasKey(e => e.Id);
    entity.Property(e => e.Id).HasColumnName("id");
    entity.Property(e => e.NarrationPointId).HasColumnName("narration_point_id");
    entity.Property(e => e.ImageUrl).HasColumnName("image_url");
});
    }
}